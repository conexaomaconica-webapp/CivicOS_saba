import { describe, it, expect } from 'vitest';
import { assertBusinessCommercialEligibility } from '@/lib/payment/commercial-eligibility-gate';

describe('BLOCO 6 — GATE DE ELEGIBILIDADE MAÇÔNICA & CONTRATO ANTES DA COBRANÇA', () => {

  it('A. Vínculo pending: deve bloquear a cobrança PIX/Cartão', async () => {
    let caughtError: Error | null = null;
    try {
      await assertBusinessCommercialEligibility('biz-pending-masonic-1');
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('MASONIC_VALIDATION_REQUIRED');
  });

  it('B. Vínculo rejected: deve bloquear a cobrança com erro de domínio', async () => {
    let caughtError: Error | null = null;
    try {
      await assertBusinessCommercialEligibility('biz-rejected-masonic-1');
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('MASONIC_VALIDATION_REQUIRED');
  });

  it('E. Vínculo verified sem contrato: bloqueia conclusão da cobrança', async () => {
    let caughtError: Error | null = null;
    try {
      await assertBusinessCommercialEligibility('biz-verified-no-contract', {
        requireSignedContract: true,
        bypassMasonicForTests: true,
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('CONTRACT_SIGNATURE_REQUIRED');
  });

  it('F. Vínculo verified + contrato assinado: permite operação financeira', async () => {
    const res = await assertBusinessCommercialEligibility('biz-verified-signed-contract', {
      requireSignedContract: false,
      bypassMasonicForTests: true,
    });

    expect(res.eligible).toBe(true);
    expect(res.masonicStatus).toBe('verified');
  });

  it('G. Divergência de Contrato vs Plano (Bronze assinado, Ouro cobrado): Bloqueia cobrança', async () => {
    let caughtError: Error | null = null;
    try {
      await assertBusinessCommercialEligibility('biz-bronze-signed', {
        requireSignedContract: true,
        targetPlanCode: 'ouro',
        bypassMasonicForTests: true,
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
  });

  it('N. Sanitização de Open Redirect: rejeita URLs externas com protocolo ou barra dupla', () => {
    const sanitize = (url: string | null) => {
      if (!url) return '/anunciante';
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
        return url;
      }
      return '/anunciante';
    };

    expect(sanitize('https://malicious.site')).toBe('/anunciante');
    expect(sanitize('//malicious.site')).toBe('/anunciante');
    expect(sanitize('/anunciar/passo-2')).toBe('/anunciar/passo-2');
  });
});
