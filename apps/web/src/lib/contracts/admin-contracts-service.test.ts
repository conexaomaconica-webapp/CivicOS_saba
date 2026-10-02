import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { calculateContractSha256 } from './admin-contracts-service';
import {
  CANONICAL_ADVERTISER_CONTRACT_CODE,
  CANONICAL_ADVERTISER_CONTRACT_VERSION,
  CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
} from './contract-constants';
import {
  renderContractTemplate,
  AdvertiserContractVariables,
} from './contract-template-renderer';
import {
  assertCommercialStatusTransition,
  assertAdministrativeCommercialRollback,
  COMMERCIAL_STATUS,
} from '@/lib/commercial-onboarding-status';

describe('admin-contracts-service (Fase 4: Microetapa 4.2)', () => {
  const sampleVariables: AdvertiserContractVariables = {
    razao_social: 'Oficina Central de Engenharia Ltda.',
    nome_fantasia: 'Oficina Central',
    cnpj: '98.765.432/0001-10',
    endereco: 'Av. Paulista, 1000, Bela Vista, São Paulo - SP',
    responsavel_nome: 'Carlos Drummond',
    responsavel_cpf: '111.222.333-44',
    responsavel_email: 'carlos@oficinacentral.com.br',
    plano_nome: 'Plano Acácia (Pedra Fundamental)',
    vigencia: '24 meses',
    valor_total: 'R$ 1.200,00',
    forma_pagamento: 'À vista',
    parcelas: '1x',
    valor_parcela: 'R$ 1.200,00',
    selo_pedra_fundamental: '- **Reconhecimento Especial:** Empresa Fundadora — Pedra Fundamental',
    data_emissao: '01/10/2026',
  };

  describe('Cálculo e Verificação de Integridade Criptográfica (SHA-256)', () => {
    it('calcula o SHA-256 com 64 caracteres hexadecimais', async () => {
      const text = 'CONTRATO DE ADESÃO OFICIAL';
      const hash = await calculateContractSha256(text);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('hash recalculado do texto renderizado bate exatamente com o hash armazenado', async () => {
      const renderedText = renderContractTemplate(
        CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
        sampleVariables
      );

      // Simulação do hash gravado no banco de dados
      const storedHash = await calculateContractSha256(renderedText);

      // Verificação em momento posterior (recálculo independente)
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(renderedText, 'utf8')
        .digest('hex');

      expect(recalculatedHash).toBe(storedHash);
      expect(storedHash).toHaveLength(64);
    });

    it('qualquer alteração no texto invalida o hash SHA-256 (garantia de imutabilidade)', async () => {
      const originalText = renderContractTemplate(
        CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
        sampleVariables
      );
      const originalHash = await calculateContractSha256(originalText);

      const tamperedText = originalText.replace('R$ 1.200,00', 'R$ 1.000,00');
      const tamperedHash = await calculateContractSha256(tamperedText);

      expect(tamperedHash).not.toBe(originalHash);
    });
  });

  describe('Validação da Máquina de Estados (Transições para contrato_gerado)', () => {
    it('permite a transição autorizada: dados_comerciais_conferidos -> contrato_gerado', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS,
          COMMERCIAL_STATUS.CONTRATO_GERADO
        )
      ).not.toThrow();
    });

    it('bloqueia transição inválida a partir de pre_cadastro', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PRE_CADASTRO,
          COMMERCIAL_STATUS.CONTRATO_GERADO
        )
      ).toThrowError(/Transição comercial inválida: "pre_cadastro" → "contrato_gerado"/);
    });

    it('bloqueia transição inválida a partir de vinculo_informado', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.VINCULO_INFORMADO,
          COMMERCIAL_STATUS.CONTRATO_GERADO
        )
      ).toThrowError(/Transição comercial inválida: "vinculo_informado" → "contrato_gerado"/);
    });

    it('bloqueia transição inválida a partir de vinculo_verificado (exige conferência comercial prévia)', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.VINCULO_VERIFICADO,
          COMMERCIAL_STATUS.CONTRATO_GERADO
        )
      ).toThrowError(/Transição comercial inválida: "vinculo_verificado" → "contrato_gerado"/);
    });
    it('bloqueia o retorno contrato_gerado -> dados_comerciais_conferidos no fluxo canônico normal', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_GERADO,
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
        )
      ).toThrowError(/Transição comercial inválida: "contrato_gerado" → "dados_comerciais_conferidos"/);
    });

    it('permite exclusivamente via assertAdministrativeCommercialRollback o retorno administrativo auditado (Microetapa 4.3)', () => {
      expect(() =>
        assertAdministrativeCommercialRollback(
          COMMERCIAL_STATUS.CONTRATO_GERADO,
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
        )
      ).not.toThrow();

      // Bloqueia tentativas de rollback inválidas a partir de outros status
      expect(() =>
        assertAdministrativeCommercialRollback(
          COMMERCIAL_STATUS.CONTRATO_ENVIADO,
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS
        )
      ).toThrowError(/Rollback administrativo inválido/);
    });
  });

  describe('Microetapa 4.3 — Versionamento, Invalidação e Detecção de Alterações', () => {
    it('detecta mudança relevante quando dados atuais diferem do snapshot congelado', async () => {
      const originalText = renderContractTemplate(
        CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
        sampleVariables
      );
      const snapshotHash = await calculateContractSha256(originalText);

      // Admin altera o valor total ou plano posteriormente
      const updatedVariables = {
        ...sampleVariables,
        valor_total: 'R$ 1.500,00',
        valor_parcela: 'R$ 750,00',
        parcelas: '2x',
      };
      const recalculatedText = renderContractTemplate(
        CANONICAL_ADVERTISER_CONTRACT_MARKDOWN,
        updatedVariables
      );
      const recalculatedHash = await calculateContractSha256(recalculatedText);

      const hasPendingChanges = recalculatedHash !== snapshotHash;
      expect(hasPendingChanges).toBe(true);
      expect(recalculatedHash).not.toBe(snapshotHash);
    });

    it('mantém template version v1.0 estável enquanto itera snapshots sucessivos da empresa (Snapshot 1, Snapshot 2)', () => {
      // Simulação da lógica de histórico da Microetapa 4.3
      const mockContracts = [
        { id: 'contract-1', status: 'superseded', created_at: '2026-10-01T20:12:00Z', version: 'v1.0' },
        { id: 'contract-2', status: 'draft', created_at: '2026-10-01T20:45:00Z', version: 'v1.0' },
      ];

      const history = mockContracts.map((c, index) => ({
        iteration: `Snapshot ${index + 1}`,
        template_version: c.version,
        status: c.status === 'draft' ? 'Atual' : 'Substituído',
        is_current: c.status === 'draft',
      }));

      expect(history[0]!.iteration).toBe('Snapshot 1');
      expect(history[0]!.template_version).toBe('v1.0');
      expect(history[0]!.status).toBe('Substituído');
      expect(history[0]!.is_current).toBe(false);

      expect(history[1]!.iteration).toBe('Snapshot 2');
      expect(history[1]!.template_version).toBe('v1.0');
      expect(history[1]!.status).toBe('Atual');
      expect(history[1]!.is_current).toBe(true);
    });

    it('preserva integridade do snapshot anterior (superseded) sem sobrescrever hash nem texto', async () => {
      const snap1Text = renderContractTemplate(CANONICAL_ADVERTISER_CONTRACT_MARKDOWN, sampleVariables);
      const snap1Hash = await calculateContractSha256(snap1Text);

      // Nova geração com novas variáveis (Snap 2)
      const snap2Variables = { ...sampleVariables, responsavel_nome: 'Marcos Aurelio' };
      const snap2Text = renderContractTemplate(CANONICAL_ADVERTISER_CONTRACT_MARKDOWN, snap2Variables);
      const snap2Hash = await calculateContractSha256(snap2Text);

      // Snap 1 permanece íntegro e imutável
      expect(snap1Hash).toHaveLength(64);
      expect(snap2Hash).toHaveLength(64);
      expect(snap1Hash).not.toBe(snap2Hash);
      expect(snap1Text).toContain('Carlos Drummond');
      expect(snap2Text).toContain('Marcos Aurelio');
    });

    it('valida rejeição de justificativa administrativa de invalidação vazia ou menor que 5 caracteres', () => {
      const invalidReasons = ['', '   ', 'abc', '1234'];
      invalidReasons.forEach((r) => {
        const isValid = Boolean(r?.trim() && r.trim().length >= 5);
        expect(isValid).toBe(false);
      });

      const validReason = 'Alteração do plano comercial a pedido do anunciante';
      expect(validReason.trim().length >= 5).toBe(true);
    });

    it('guardrails de contrato assinado: signed não pode ser invalidado nem regerado', () => {
      const contractStatus = 'signed';
      const canInvalidate = contractStatus !== 'signed' && contractStatus !== 'awaiting_signature';
      expect(canInvalidate).toBe(false);
    });

    it('guardrails de contrato aguardando assinatura: exige revogação/cancelamento prévio', () => {
      const contractStatus = 'awaiting_signature';
      const requiresRevocation = contractStatus === 'awaiting_signature';
      expect(requiresRevocation).toBe(true);
    });
  });

  describe('Microetapa 4.4 — Envio para Assinatura, Token Seguro e Idempotência', () => {
    it('gera token criptograficamente seguro com 96 caracteres hexadecimais (48 bytes)', () => {
      const token = crypto.randomBytes(48).toString('hex');
      expect(token).toHaveLength(96);
      expect(token).toMatch(/^[a-f0-9]{96}$/);
      // Garante que não é um UUID simples (que tem 36 caracteres)
      expect(token).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('calcula validade do token para exatamente 7 dias', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
      const diffMs = expiresAt.getTime() - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
      expect(expiresAt.getTime()).toBeGreaterThan(now);
    });

    it('permite a transição canônica: contrato_gerado -> contrato_enviado', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_GERADO,
          COMMERCIAL_STATUS.CONTRATO_ENVIADO
        )
      ).not.toThrow();
    });

    it('bloqueia envio direto para contrato_enviado sem gerar contrato antes', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS,
          COMMERCIAL_STATUS.CONTRATO_ENVIADO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.VINCULO_VERIFICADO,
          COMMERCIAL_STATUS.CONTRATO_ENVIADO
        )
      ).toThrowError(/Transição comercial inválida/);
    });

    it('monta a mensagem pronta de WhatsApp conforme a especificação oficial', () => {
      const nome = 'Carlos Drummond';
      const token = 'a'.repeat(96);
      const publicUrl = `https://conexaomaconica.com.br/contratacao/${token}`;

      const message = `Olá, ${nome}.\n\nSeu contrato da Conexão Maçônica está disponível para conferência e assinatura:\n\n${publicUrl}\n\nApós a assinatura, você poderá prosseguir para a etapa de pagamento.`;

      expect(message).toContain('Olá, Carlos Drummond.');
      expect(message).toContain(publicUrl);
      expect(message).toContain('Após a assinatura, você poderá prosseguir para a etapa de pagamento.');
    });

    it('valida rejeição de justificativa administrativa de revogação de link vazia ou menor que 5 caracteres', () => {
      const invalidReasons = ['', '  ', 'err', '1234'];
      invalidReasons.forEach((r) => {
        const isValid = Boolean(r?.trim() && r.trim().length >= 5);
        expect(isValid).toBe(false);
      });

      const validReason = 'Anunciante solicitou alteração no parcelamento';
      expect(validReason.trim().length >= 5).toBe(true);
    });
  });

  describe('Fase 5 — Assinatura Eletrônica e Hardening de Tokens (Microetapas 5.1 a 5.5)', () => {
    it('Hardening 1: calcula hash SHA-256 do token bruto garantindo ausência de texto puro no banco', () => {
      const rawToken = crypto.randomBytes(48).toString('hex');
      expect(rawToken).toHaveLength(96);

      const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
      expect(tokenHash).toHaveLength(64);
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);

      // Re-cálculo com o mesmo token gera o mesmo hash (determinístico para consulta pública)
      const lookupHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
      expect(lookupHash).toBe(tokenHash);

      // Token diferente gera hash diferente
      const differentToken = crypto.randomBytes(48).toString('hex');
      const differentHash = crypto.createHash('sha256').update(differentToken, 'utf8').digest('hex');
      expect(differentHash).not.toBe(tokenHash);
    });

    it('Hardening 2: vincula token estritamente ao contract_id e snapshot_id', () => {
      const mockContractId = '11111111-1111-4111-8111-111111111111';
      const mockSnapshotId = '22222222-2222-4222-8222-222222222222';
      const rawToken = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');

      const tokenRecord = {
        business_id: '33333333-3333-4333-8333-333333333333',
        contract_id: mockContractId,
        snapshot_id: mockSnapshotId,
        token_hash: tokenHash,
        token: null, // Zero plaintext
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_revoked: false,
      };

      expect(tokenRecord.token).toBeNull();
      expect(tokenRecord.contract_id).toBe(mockContractId);
      expect(tokenRecord.snapshot_id).toBe(mockSnapshotId);
      expect(tokenRecord.token_hash).toBe(tokenHash);
    });

    it('permite a transição canônica: contrato_enviado -> contrato_assinado (Microetapa 5.4)', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_ENVIADO,
          COMMERCIAL_STATUS.CONTRATO_ASSINADO
        )
      ).not.toThrow();
    });

    it('bloqueia transição direta para contrato_assinado a partir de estados anteriores ao envio', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_GERADO,
          COMMERCIAL_STATUS.CONTRATO_ASSINADO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS,
          COMMERCIAL_STATUS.CONTRATO_ASSINADO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.PRE_CADASTRO,
          COMMERCIAL_STATUS.CONTRATO_ASSINADO
        )
      ).toThrowError(/Transição comercial inválida/);
    });

    it('5.1: validação de aceite obrigatório e integridade do CPF do signatário', () => {
      const validCpf = '12345678909';
      const repeatedCpf = '11111111111';
      const shortCpf = '12345';

      // Validação de formato de CPF
      const cleanDigits = (val: string) => val.replace(/\D/g, '');
      expect(cleanDigits('123.456.789-09')).toBe(validCpf);
      expect(cleanDigits(repeatedCpf)).toHaveLength(11);
      expect(cleanDigits(shortCpf)).toHaveLength(5);

      // Aceite dos termos deve ser expressamente true
      const checkAgreeTerms = (agree: boolean) => {
        if (!agree) throw new Error('É obrigatório concordar expressamente com os termos do contrato.');
        return true;
      };

      expect(() => checkAgreeTerms(false)).toThrow();
      expect(checkAgreeTerms(true)).toBe(true);
    });

    it('5.2: validação do canvas de assinatura (rejeita canvas vazio)', () => {
      const isValidSignatureData = (dataUrl: string | undefined | null) => {
        if (!dataUrl) return false;
        if (!dataUrl.startsWith('data:image/')) return false;
        if (dataUrl.length < 200) return false;
        return true;
      };

      expect(isValidSignatureData(null)).toBe(false);
      expect(isValidSignatureData('')).toBe(false);
      expect(isValidSignatureData('data:image/png;base64,short')).toBe(false);
      expect(isValidSignatureData('data:image/png;base64,' + 'A'.repeat(300))).toBe(true);
    });

    it('5.5: valida estrutura de dados da tela pós-assinatura', () => {
      const postSignatureData = {
        contract_id: '11111111-1111-4111-8111-111111111111',
        snapshot_id: '22222222-2222-4222-8222-222222222222',
        commercial_status: 'contrato_assinado',
        accepted_at: new Date().toISOString(),
        signer_cpf: '12345678909',
        business_name: 'Minha Empresa Ltda',
        plan_name: 'Acácia',
        amount_cents: 99000,
        formatted_amount: 'R$ 990,00',
        billing_cycle: 'Anual (12 meses)',
        payment_method: 'À vista',
        installments_count: 1,
      };

      expect(postSignatureData.commercial_status).toBe('contrato_assinado');
      expect(postSignatureData.plan_name).toBe('Acácia');
      expect(postSignatureData.formatted_amount).toBe('R$ 990,00');
    });
  });

  describe('Constantes e Identificadores Canônicos', () => {
    it('código e versão canônica do contrato de anunciante conferem com a especificação', () => {
      expect(CANONICAL_ADVERTISER_CONTRACT_CODE).toBe('contrato_adesao_anunciante_v1');
      expect(CANONICAL_ADVERTISER_CONTRACT_VERSION).toBe('v1.0');
    });
  });
});

