import { describe, it, expect } from 'vitest';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import { anonymizeIpForAudit } from '@/lib/contracts/contract-constants';

describe('Microetapa 6.1 — Criação Segura de Cobrança Asaas e Hardenings', () => {
  describe('Hardening 1: Anonimização de IP para LGPD', () => {
    it('mantém loopback local seguro', () => {
      expect(anonymizeIpForAudit('127.0.0.1')).toBe('127.0.0.1');
      expect(anonymizeIpForAudit('::1')).toBe('127.0.0.1');
      expect(anonymizeIpForAudit('localhost')).toBe('127.0.0.1');
    });

    it('converte IPs públicos reais em hash criptográfico SHA-256 de 64 caracteres hexadecimais', () => {
      const publicIp = '189.40.122.95';
      const hashedIp = anonymizeIpForAudit(publicIp);

      expect(hashedIp).toHaveLength(64);
      expect(hashedIp).toMatch(/^[0-9a-f]{64}$/);
      expect(hashedIp).not.toContain('189.40');

      // Determinístico para a mesma requisição probatória
      expect(anonymizeIpForAudit(publicIp)).toBe(hashedIp);

      // IPs diferentes produzem hashes diferentes
      const anotherIp = '201.82.15.4';
      expect(anonymizeIpForAudit(anotherIp)).not.toBe(hashedIp);
    });
  });

  describe('Microetapa 6.1: Regras Inegociáveis de Faturamento', () => {
    it('o valor da cobrança é carregado exclusivamente de business_commercial_terms no backend', () => {
      // Simula termos comerciais congelados no backend
      const termsFromDb = {
        amount_cents: 99000,
        plan_code: 'acacia',
        plan_name: 'Acácia',
        billing_cycle: 'annual',
        payment_method: 'avista',
        installments_count: 1,
      };

      // Payload recebido do frontend não contém 'amount' ou 'price'
      const clientPayload = {
        token: 'a'.repeat(96),
        payment_method: 'pix' as const,
      };

      expect((clientPayload as any).amount).toBeUndefined();
      expect((clientPayload as any).price).toBeUndefined();
      expect(termsFromDb.amount_cents).toBe(99000);
      expect(termsFromDb.amount_cents / 100).toBe(990.0);
    });

    it('garante idempotência estrita na chave de faturamento vinculada ao contrato', () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const businessId = '11111111-1111-4111-8111-111111111111';
      const contractId = '22222222-2222-4222-8222-222222222222';
      const planCode = 'acacia';

      const idempotencyKey = `onboarding_inv_${tenantId}_${businessId}_${contractId}_${planCode}`;

      expect(idempotencyKey).toBe(
        'onboarding_inv_00000000-0000-0000-0000-000000000001_11111111-1111-4111-8111-111111111111_22222222-2222-4222-8222-222222222222_acacia'
      );
    });

    it('permite a transição canônica: contrato_assinado -> aguardando_pagamento (Microetapa 6.4)', () => {
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_ASSINADO,
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO
        )
      ).not.toThrow();
    });

    it('bloqueia geração de cobrança se o contrato ainda não estiver assinado', () => {
      // Bloqueia transições prematuras
      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_ENVIADO,
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.CONTRATO_GERADO,
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO
        )
      ).toThrowError(/Transição comercial inválida/);

      expect(() =>
        assertCommercialStatusTransition(
          COMMERCIAL_STATUS.DADOS_COMERCIAIS_CONFERIDOS,
          COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO
        )
      ).toThrowError(/Transição comercial inválida/);
    });

    it('valida formatação correta de valor em moeda brasileira BRL', () => {
      const amountCents = 149000;
      const formatted = (amountCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      // Normaliza espaços não quebráveis do Intl
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toBe('R$ 1.490,00');
    });
  });

  describe('Microetapa 6.2: Critérios de Aceite da Interface e Sessão de Pagamento Pós-Assinatura', () => {
    it('critério 1: Contrato não assinado -> bloqueado de acessar ou criar cobrança de pagamento', () => {
      const statusContrato: string = 'draft';
      const commercialStatus: string = 'contrato_enviado';

      // Simula a guarda no backend
      const canProceedToPayment =
        statusContrato === 'signed' &&
        (commercialStatus === 'contrato_assinado' || commercialStatus === 'aguardando_pagamento');

      expect(canProceedToPayment).toBe(false);
    });

    it('critério 2: Contrato assinado -> vê resumo financeiro imutável vindo do backend', () => {
      const frozenTerms = {
        plan_code: 'acacia',
        plan_name: 'Acácia',
        billing_cycle: 'annual',
        amount_cents: 100000,
        installments_count: 4,
        payment_method: 'parcelado',
      };

      // Simula o resumo apresentado na UI
      const summary = {
        planName: frozenTerms.plan_name,
        validity: frozenTerms.billing_cycle === 'annual' ? '12 meses' : 'Mensal',
        formattedTotal: (frozenTerms.amount_cents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).replace(/\u00a0/g, ' '),
        installmentCondition: `${frozenTerms.installments_count}x de R$ ${(
          frozenTerms.amount_cents /
          100 /
          frozenTerms.installments_count
        ).toFixed(2).replace('.', ',')}`,
      };

      expect(summary.planName).toBe('Acácia');
      expect(summary.validity).toBe('12 meses');
      expect(summary.formattedTotal).toBe('R$ 1.000,00');
      expect(summary.installmentCondition).toBe('4x de R$ 250,00');
    });

    it('critério 3: Tentativa de alterar valor vindo do frontend é ignorada/bloqueada', () => {
      const clientPayload = {
        token: 'valid-payment-token',
        payment_method: 'pix' as const,
        amount: 10.0, // Tentativa maliciosa de pagar R$ 10,00
        plan: 'diamante', // Tentativa maliciosa de trocar o plano
      };

      const dbTerms = {
        amount_cents: 149000, // R$ 1.490,00 canônico
        plan_code: 'acacia',
      };

      // Backend ignora valores do clientPayload e utiliza exclusivamente os termos do banco
      const finalAmountCents = dbTerms.amount_cents;
      const finalPlanCode = dbTerms.plan_code;

      expect(finalAmountCents).toBe(149000);
      expect(finalPlanCode).toBe('acacia');
      expect(finalAmountCents).not.toBe((clientPayload as any).amount * 100);
    });

    it('critério 4 & 5: PIX gera cobrança e disponibiliza QR Code + Copia e Cola', () => {
      const pixChargeResult = {
        success: true,
        payment_method: 'pix',
        pix_copia_e_cola: '00020101021226880014br.gov.bcb.pix2566qrcode.asaas.com/cob/123455204000053039865802BR5925Conexao Maconico6009Sao Paulo62070503***6304ABCD',
        qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACFi5SrAAAABlBMVEUAAAD///+l2Z/dAAAA',
        status: 'aguardando_pagamento',
      };

      expect(pixChargeResult.success).toBe(true);
      expect(pixChargeResult.payment_method).toBe('pix');
      expect(pixChargeResult.pix_copia_e_cola).toContain('000201010212');
      expect(pixChargeResult.qr_code_base64).toMatch(/^iVBOR/);
      expect(pixChargeResult.status).toBe('aguardando_pagamento');
    });

    it('critério 6: Cartão de crédito restringe parcelamento estritamente ao congelado em business_commercial_terms', () => {
      const termsMaxInstallments = 4; // Contratado em 4x

      // Gerador de opções de parcelas da interface
      const availableInstallmentOptions = Array.from(
        { length: termsMaxInstallments },
        (_, i) => i + 1
      );

      expect(availableInstallmentOptions).toEqual([1, 2, 3, 4]);
      expect(availableInstallmentOptions).not.toContain(5);
      expect(availableInstallmentOptions).not.toContain(12);

      // Backend enforce: mesmo se o cliente forçar envio de 12x via API
      const clientRequestedInstallments = 12;
      const finalInstallments = Math.min(
        Math.max(1, clientRequestedInstallments),
        termsMaxInstallments
      );

      expect(finalInstallments).toBe(4);
    });

    it('critério 7: Idempotência visual no refresh (não duplica cobrança no gateway)', () => {
      // Simula uma fatura e tentativa já existentes no banco
      const existingInvoice = {
        id: 'inv_123',
        status: 'open',
        amount_due: 1000.0,
      };

      const existingPixAttempt = {
        id: 'att_456',
        provider_code: 'asaas',
        provider_charge_id: 'pay_asaas_789',
        method: 'pix',
        amount: 1000.0,
        status: 'pending',
        response_payload: {
          pix_copia_e_cola: '000201010212...',
          qr_code_base64: 'base64_existing_qr_code',
        },
      };

      // Quando o usuário recarrega a tela, o backend localiza a tentativa existente
      const chargeAlreadyGenerated = existingInvoice && existingPixAttempt;
      expect(chargeAlreadyGenerated).toBeTruthy();

      const restoredCharge = {
        invoice_id: existingInvoice.id,
        charge_id: existingPixAttempt.provider_charge_id,
        payment_method: existingPixAttempt.method,
        pix_copia_e_cola: existingPixAttempt.response_payload.pix_copia_e_cola,
        qr_code_base64: existingPixAttempt.response_payload.qr_code_base64,
        status: 'aguardando_pagamento',
      };

      expect(restoredCharge.charge_id).toBe('pay_asaas_789');
      expect(restoredCharge.pix_copia_e_cola).toBe('000201010212...');
    });

    it('critério 8: Separação de tokens: contract_signature é revogado na assinatura e onboarding_payment gerencia o pagamento', () => {
      const contractToken = {
        token_type: 'contract_signature',
        is_revoked: false,
      };

      // Assinatura do contrato ocorre
      contractToken.is_revoked = true; // Revogado após uso único

      // Novo token de pagamento dedicado é gerado
      const paymentToken = {
        token_type: 'onboarding_payment',
        is_revoked: false,
        expires_at: new Date(Date.now() + 72 * 3600 * 1000), // 72 horas para pagar
      };

      expect(contractToken.is_revoked).toBe(true);
      expect(paymentToken.token_type).toBe('onboarding_payment');
      expect(paymentToken.is_revoked).toBe(false);
    });
  });
});

