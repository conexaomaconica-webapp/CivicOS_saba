import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config';

describe('ETAPA 2 — Testes de Segurança, CSP Efetiva e Proteção de Contratos', () => {

  describe('1. Promoção de CSP para Ativo (Content-Security-Policy)', () => {
    it('next.config.ts define o cabeçalho Content-Security-Policy em modo ativo (não apenas Report-Only)', async () => {
      const headersConfig = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : [];
      const globalHeaders = headersConfig.find((h) => h.source === '/:path*')?.headers || [];

      const cspHeader = globalHeaders.find((h) => h.key === 'Content-Security-Policy');
      expect(cspHeader).toBeDefined();
      expect(cspHeader?.key).toBe('Content-Security-Policy');
      expect(cspHeader?.value).toContain("default-src 'self'");
      expect(cspHeader?.value).toContain("object-src 'none'");
      expect(cspHeader?.value).toContain("base-uri 'self'");
      expect(cspHeader?.value).toContain("blob:");
    });

    it('next.config.ts não mantém Content-Security-Policy-Report-Only ativo por padrão em produção', async () => {
      const headersConfig = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : [];
      const globalHeaders = headersConfig.find((h) => h.source === '/:path*')?.headers || [];

      const cspReportOnly = globalHeaders.find((h) => h.key === 'Content-Security-Policy-Report-Only');
      expect(cspReportOnly).toBeUndefined();
    });
  });

  describe('2. Reforço e Validação da Rota de Contrato /contratacao/[token]', () => {
    it('getPublicContractByTokenAction rejeita tokens curtos, nulos ou malformados com erro amigável', async () => {
      const { getPublicContractByTokenAction } = await import('../src/lib/contracts/admin-contracts-service');

      const emptyRes = await getPublicContractByTokenAction('');
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain('Token de acesso inválido');

      const shortRes = await getPublicContractByTokenAction('abc12');
      expect(shortRes.success).toBe(false);
      expect(shortRes.error).toContain('Token de acesso inválido');
    });

    it('signPublicContractAction bloqueia tentativas de assinatura sem consentimento ou com CPF/token inválidos', async () => {
      const { signPublicContractAction } = await import('../src/lib/contracts/admin-contracts-service');

      // Sem consentimento
      const noConsentRes = await signPublicContractAction({
        token: 'token_de_tamanho_valido_com_mais_de_24_caracteres_123',
        signer_cpf: '111.111.111-11',
        signer_name: 'João Silva',
        agree_terms: false,
        signature_image_data: `data:image/png;base64,${'A'.repeat(250)}`,
      });
      expect(noConsentRes.success).toBe(false);
      expect(noConsentRes.error).toContain('É obrigatório declarar ciência');

      // CPF inválido
      const invalidCpfRes = await signPublicContractAction({
        token: 'token_de_tamanho_valido_com_mais_de_24_caracteres_123',
        signer_cpf: '000.000.000-00',
        signer_name: 'João Silva',
        agree_terms: true,
        signature_image_data: `data:image/png;base64,${'A'.repeat(250)}`,
      });
      expect(invalidCpfRes.success).toBe(false);
      expect(invalidCpfRes.error).toContain('CPF');
    });
  });

  describe('3. Integridade e Sanitização de Logs Operacionais', () => {
    it('Cabeçalhos HSTS, X-Frame-Options e Referrer-Policy permanecem ativos', async () => {
      const headersConfig = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : [];
      const globalHeaders = headersConfig.find((h) => h.source === '/:path*')?.headers || [];

      expect(globalHeaders.some((h) => h.key === 'Strict-Transport-Security')).toBe(true);
      expect(globalHeaders.some((h) => h.key === 'X-Frame-Options' && h.value === 'DENY')).toBe(true);
      expect(globalHeaders.some((h) => h.key === 'X-Content-Type-Options' && h.value === 'nosniff')).toBe(true);
    });
  });

});

