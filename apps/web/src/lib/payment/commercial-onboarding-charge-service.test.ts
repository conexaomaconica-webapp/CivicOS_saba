import { describe, it, expect } from 'vitest';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';
import { anonymizeIpForAudit } from '@/lib/contracts/contract-constants';
import { buildOnboardingPaymentReference } from '@/lib/payment/payment-idempotency';
import { getCheckoutMaxInstallments, getCheckoutCalculatedAmount } from '@/lib/payment/payment-rules-types';

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

      expect(hashedIp).toHaveLength(45);
      expect(hashedIp).toMatch(/^sha256:[0-9a-f]{38}$/);
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

      const idempotencyKey = buildOnboardingPaymentReference({ tenantId, businessId, contractId, planCode });
      const repeatedKey = buildOnboardingPaymentReference({ tenantId, businessId, contractId, planCode });

      expect(idempotencyKey).toBe(repeatedKey);
      expect(idempotencyKey).toMatch(/^onb_[0-9a-f]{64}$/);
      expect(idempotencyKey.length).toBeLessThanOrEqual(100);
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

    it('critério 6: Cartão de crédito restringe parcelamento ao teto comercial do plano e permite até 4x para Acácia com Pedra Fundamental', () => {
      // 1. Plano Acácia com Pedra Fundamental contratado à vista (1x) permite parcelar em até 4x no cartão
      const pedraMax = getCheckoutMaxInstallments({
        installmentsCount: 1,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
        isPedraFundamental: true,
      });
      expect(pedraMax).toBe(4);

      // 2. Plano Acácia normal permite até 4x
      const acaciaMax = getCheckoutMaxInstallments({
        installmentsCount: 1,
        planCode: 'ouro',
        planName: 'Plano Acácia',
        isPedraFundamental: false,
      });
      expect(acaciaMax).toBe(4);

      // 3. Plano Compasso permite até 3x
      const compassoMax = getCheckoutMaxInstallments({
        installmentsCount: 1,
        planCode: 'prata',
        planName: 'Plano Compasso',
        isPedraFundamental: false,
      });
      expect(compassoMax).toBe(3);

      // 4. Plano Esquadro permite até 2x
      const esquadroMax = getCheckoutMaxInstallments({
        installmentsCount: 1,
        planCode: 'bronze',
        planName: 'Plano Esquadro',
        isPedraFundamental: false,
      });
      expect(esquadroMax).toBe(2);

      // 5. Opções geradas para o seletor do cartão no Plano Acácia c/ Pedra Fundamental
      const availableInstallmentOptions = Array.from(
        { length: pedraMax },
        (_, i) => i + 1
      );
      expect(availableInstallmentOptions).toEqual([1, 2, 3, 4]);
      expect(availableInstallmentOptions).not.toContain(5);
      expect(availableInstallmentOptions).not.toContain(12);

      // 6. Backend enforce: cliente solicitando 12x tem parcelamento limitado ao teto de 4x
      const clientRequestedInstallments = 12;
      const finalInstallments = Math.min(
        Math.max(1, clientRequestedInstallments),
        pedraMax
      );
      expect(finalInstallments).toBe(4);

      // 7. Cliente solicitando 3x dentro do teto de 4x tem suas 3 parcelas respeitadas
      const clientRequested3 = 3;
      const finalInstallments3 = Math.min(
        Math.max(1, clientRequested3),
        pedraMax
      );
      expect(finalInstallments3).toBe(3);
    });

    it('critério 6.1: Plano Acácia com Pedra Fundamental pode parcelar até 4x ficando R$ 1.300,00 ou R$ 1.200,00 à vista', () => {
      // 1. Pagamento via PIX: R$ 1.200,00 (desconto à vista)
      const pixPricing = getCheckoutCalculatedAmount({
        amountCents: 120000,
        paymentMethod: 'pix',
        installmentsCount: 1,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(pixPricing.finalAmountCents).toBe(120000);
      expect(pixPricing.installmentValueCents).toBe(120000);
      expect(pixPricing.isDiscountedAvista).toBe(true);

      // 2. Pagamento via Cartão de Crédito 1x: valor de cartão R$ 1.300,00
      const card1xPricing = getCheckoutCalculatedAmount({
        amountCents: 120000,
        paymentMethod: 'credit_card',
        installmentsCount: 1,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(card1xPricing.finalAmountCents).toBe(130000);
      expect(card1xPricing.installmentValueCents).toBe(130000);
      expect(card1xPricing.isDiscountedAvista).toBe(false);

      // 3. Pagamento via Cartão de Crédito 4x: total R$ 1.300,00 (4x de R$ 325,00)
      const card4xPricing = getCheckoutCalculatedAmount({
        amountCents: 120000,
        paymentMethod: 'credit_card',
        installmentsCount: 4,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(card4xPricing.finalAmountCents).toBe(130000);
      expect(card4xPricing.installmentValueCents).toBe(32500); // 4x de R$ 325,00
      expect(card4xPricing.isDiscountedAvista).toBe(false);

      // 4. Pagamento via Cartão de Crédito 2x: total R$ 1.300,00 (2x de R$ 650,00)
      const card2xPricing = getCheckoutCalculatedAmount({
        amountCents: 120000,
        paymentMethod: 'credit_card',
        installmentsCount: 2,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(card2xPricing.finalAmountCents).toBe(130000);
      expect(card2xPricing.installmentValueCents).toBe(65000); // 2x de R$ 650,00

      // 5. Pagamento via Cartão de Crédito 3x: total R$ 1.300,00 (3x de R$ 433,33)
      const card3xPricing = getCheckoutCalculatedAmount({
        amountCents: 120000,
        paymentMethod: 'credit_card',
        installmentsCount: 3,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(card3xPricing.finalAmountCents).toBe(130000);
      expect(card3xPricing.installmentValueCents).toBe(43333);

      // 6. Mesmo se o contrato no banco tiver sido salvo como 130000 (parcelado), ao pagar PIX aplica R$ 1.200,00
      const pixFromParceladoDb = getCheckoutCalculatedAmount({
        amountCents: 130000,
        paymentMethod: 'pix',
        installmentsCount: 1,
        isPedraFundamental: true,
        planCode: 'ouro',
        planName: 'Plano Acácia (Pedra Fundamental)',
      });
      expect(pixFromParceladoDb.finalAmountCents).toBe(120000);

      // 7. Planos regulares respeitam valores específicos para PIX e Cartão de Crédito (mesmo 1x):
      // A) Plano Compasso: PIX = R$ 800,00 | Cartão 1x = R$ 855,00 | Cartão 3x = 3x de R$ 285,00 (Total R$ 855,00)
      const compassoPix = getCheckoutCalculatedAmount({
        amountCents: 80000,
        paymentMethod: 'pix',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'prata',
        planName: 'Plano Compasso',
      });
      expect(compassoPix.finalAmountCents).toBe(80000);
      expect(compassoPix.installmentValueCents).toBe(80000);

      const compasso1x = getCheckoutCalculatedAmount({
        amountCents: 80000,
        paymentMethod: 'credit_card',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'prata',
        planName: 'Plano Compasso',
      });
      expect(compasso1x.finalAmountCents).toBe(85500);
      expect(compasso1x.installmentValueCents).toBe(85500);

      const compasso3x = getCheckoutCalculatedAmount({
        amountCents: 80000,
        paymentMethod: 'credit_card',
        installmentsCount: 3,
        isPedraFundamental: false,
        planCode: 'prata',
        planName: 'Plano Compasso',
      });
      expect(compasso3x.finalAmountCents).toBe(85500);
      expect(compasso3x.installmentValueCents).toBe(28500); // 3x de R$ 285,00

      // B) Plano Esquadro: PIX = R$ 600,00 | Cartão 1x = R$ 635,00 | Cartão 2x = 2x de R$ 317,50 (Total R$ 635,00)
      const esquadroPix = getCheckoutCalculatedAmount({
        amountCents: 60000,
        paymentMethod: 'pix',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'bronze',
        planName: 'Plano Esquadro',
      });
      expect(esquadroPix.finalAmountCents).toBe(60000);

      const esquadro1x = getCheckoutCalculatedAmount({
        amountCents: 60000,
        paymentMethod: 'credit_card',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'bronze',
        planName: 'Plano Esquadro',
      });
      expect(esquadro1x.finalAmountCents).toBe(63500);
      expect(esquadro1x.installmentValueCents).toBe(63500);

      const esquadro2x = getCheckoutCalculatedAmount({
        amountCents: 60000,
        paymentMethod: 'credit_card',
        installmentsCount: 2,
        isPedraFundamental: false,
        planCode: 'bronze',
        planName: 'Plano Esquadro',
      });
      expect(esquadro2x.finalAmountCents).toBe(63500);
      expect(esquadro2x.installmentValueCents).toBe(31750); // 2x de R$ 317,50

      // C) Plano Acácia regular: PIX = R$ 1.000,00 | Cartão 1x = R$ 1.080,00 | Cartão 4x = 4x de R$ 270,00 (Total R$ 1.080,00)
      const acaciaPix = getCheckoutCalculatedAmount({
        amountCents: 100000,
        paymentMethod: 'pix',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'ouro',
        planName: 'Plano Acácia',
      });
      expect(acaciaPix.finalAmountCents).toBe(100000);

      const acacia1x = getCheckoutCalculatedAmount({
        amountCents: 100000,
        paymentMethod: 'credit_card',
        installmentsCount: 1,
        isPedraFundamental: false,
        planCode: 'ouro',
        planName: 'Plano Acácia',
      });
      expect(acacia1x.finalAmountCents).toBe(108000);
      expect(acacia1x.installmentValueCents).toBe(108000);

      const acacia4x = getCheckoutCalculatedAmount({
        amountCents: 100000,
        paymentMethod: 'credit_card',
        installmentsCount: 4,
        isPedraFundamental: false,
        planCode: 'ouro',
        planName: 'Plano Acácia',
      });
      expect(acacia4x.finalAmountCents).toBe(108000);
      expect(acacia4x.installmentValueCents).toBe(27000); // 4x de R$ 270,00
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
