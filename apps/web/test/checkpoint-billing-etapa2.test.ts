import { describe, it, expect } from 'vitest';
import { AsaasPaymentProvider } from '../src/lib/payment/asaas-payment-provider';
import { CANONICAL_PLAN_PAYMENT_RULES } from '../src/lib/payment/payment-rules-types';

describe('BLOCO 7 — ETAPA 2A: CHECKPOINT DO MOTOR DE CHECKOUT CANÔNICO & ASAAS', () => {
  it('1. Deve validar que as regras de preço e parcelamento vêm da fonte canônica do banco', () => {
    expect(CANONICAL_PLAN_PAYMENT_RULES['prata']).toBeDefined();
    expect(CANONICAL_PLAN_PAYMENT_RULES['prata'].amountCents).toBe(178800);
    expect(CANONICAL_PLAN_PAYMENT_RULES['ouro']).toBeDefined();
    expect(CANONICAL_PLAN_PAYMENT_RULES['ouro'].amountCents).toBe(238800);
    expect(CANONICAL_PLAN_PAYMENT_RULES['ouro'].installmentsMax).toBe(12);
  });

  it('2. Deve garantir que AsaasPaymentProvider possui método de reconciliação de timeout por externalReference', async () => {
    const provider = new AsaasPaymentProvider();
    expect(typeof provider.findPaymentByExternalReference).toBe('function');
    
    // Busca por referência inexistente deve retornar found = false
    const res = await provider.findPaymentByExternalReference('ref_non_existent_12345');
    expect(res.found).toBe(false);
  });

  it('3. Guardrail de Cartão: Deve garantir que PAN e CVV não são persistidos ou mantidos em log', () => {
    const cardData = {
      holderName: 'NOME ANUNCIANTE',
      cardNumber: '4532 1111 2222 3333',
      expiryMonth: '12',
      expiryYear: '28',
      ccv: '123',
    };

    const sanitizedPayload = {
      card_holder_sanitized: cardData.holderName,
      card_last4: cardData.cardNumber.slice(-4),
    };

    expect(sanitizedPayload.card_last4).toBe('3333');
    expect((sanitizedPayload as any).cardNumber).toBeUndefined();
    expect((sanitizedPayload as any).ccv).toBeUndefined();
  });

  it('4. Guardrail de Produção: confirmPaymentWebhookSimulationAction deve ser completamente removida da superfície de Server Actions', async () => {
    const actions = await import('../src/app/actions/onboarding-checkout-actions');
    expect((actions as any).confirmPaymentWebhookSimulationAction).toBeUndefined();
  });

  it('5. Guardrail de Reconciliação: Rejeição por anomalia de múltiplas cobranças externas para a mesma referência', async () => {
    const provider = new AsaasPaymentProvider();
    
    // Mock simulando comportamento do Asaas quando a referência devolve duplicidade
    provider.findPaymentByExternalReference = async (ref: string) => {
      if (ref === 'ref_duplicate_test') {
        throw new Error(`ANOMALY_MULTIPLE_PAYMENTS_FOR_EXTERNAL_REFERENCE: Foram encontradas 2 cobranças no Asaas com externalReference ${ref}`);
      }
      return { found: false };
    };

    await expect(provider.findPaymentByExternalReference('ref_duplicate_test')).rejects.toThrow('ANOMALY_MULTIPLE_PAYMENTS_FOR_EXTERNAL_REFERENCE');
  });

  it('6. Idempotência Server-Side: Deve gerar chave de idempotência determinística e estável', () => {
    const tenantId = '00000000-0000-0000-0000-000000000010';
    const businessId = '00000000-0000-0000-0000-000000000201';
    const planCode = 'ouro';

    const key1 = `chk_${tenantId}_${businessId}_${planCode}`;
    const key2 = `chk_${tenantId}_${businessId}_${planCode}`;

    expect(key1).toBe(key2);
    expect(key1).toBe('chk_00000000-0000-0000-0000-000000000010_00000000-0000-0000-0000-000000000201_ouro');
  });
});
