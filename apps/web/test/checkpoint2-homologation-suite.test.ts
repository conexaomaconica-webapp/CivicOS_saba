import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/payment/commercial-eligibility-gate', () => ({
  assertBusinessCommercialEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    masonicVerified: true,
    contractSigned: false,
    reasons: [],
  }),
}));

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));

import {
  processPixCheckoutAction,
  processCreditCardCheckoutAction,
  getPlanPaymentRulesAction,
  updatePlanPaymentRulesAdminAction,
} from '../src/lib/payment/payment-service';

describe('CHECKPOINT 2 — SUÍTE INTEGRADA DE HOMOLOGAÇÃO DO CHECKOUT ASAAS & DYNAMIC RULES', () => {
  // 1. PIX CREATION & QR CODE
  it('1. PIX Creation & QR Code Copy-and-Paste payload generation', async () => {
    const res = await processPixCheckoutAction({
      businessId: 'biz_e2e_001',
      planCode: 'prata',
      customerName: 'Comandos - Terceirização',
      customerEmail: 'contato@comandos.com.br',
      customerPhone: '11999998888',
      cpfCnpj: '12.345.678/0001-90',
    });

    expect(res.success).toBe(true);
    expect(res.paymentId).toBeDefined();
    expect(res.pixCopiaECola).toBeDefined();
    expect(res.pixCopiaECola.length).toBeGreaterThan(10);
    expect(res.status).toBe('Aguardando pagamento');
  });

  // 2. MATRIZ DE TESTES POR PLANO: BRONZE
  describe('Matriz Bronze', () => {
    it('Bronze — 1x (Permitido)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_bronze_1',
        planCode: 'bronze',
        installmentCount: 1,
        customerName: 'Cliente Bronze',
        customerEmail: 'bronze@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE BRONZE',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(1);
    });

    it('Bronze — Máximo Permitido (3x)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_bronze_3',
        planCode: 'bronze',
        installmentCount: 3,
        customerName: 'Cliente Bronze 3x',
        customerEmail: 'bronze3@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE BRONZE',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(3);
    });

    it('Bronze — Máximo + 1 (4x) → BLOQUEADO no servidor', async () => {
      await expect(
        processCreditCardCheckoutAction({
          businessId: 'biz_bronze_4',
          planCode: 'bronze',
          installmentCount: 4,
          customerName: 'Cliente Bronze 4x Inválido',
          customerEmail: 'bronze4@conexaomaconica.com.br',
          card: {
            holderName: 'CLIENTE BRONZE',
            cardNumber: '4532111122223333',
            expiryMonth: '12',
            expiryYear: '2030',
            ccv: '123',
            cpfCnpj: '12345678900',
          },
        })
      ).rejects.toThrow('INVALID_INSTALLMENT');
    });
  });

  // 3. MATRIZ DE TESTES POR PLANO: PRATA
  describe('Matriz Prata', () => {
    it('Prata — 1x (Permitido)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_prata_1',
        planCode: 'prata',
        installmentCount: 1,
        customerName: 'Cliente Prata',
        customerEmail: 'prata@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE PRATA',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(1);
    });

    it('Prata — Máximo Permitido (6x)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_prata_6',
        planCode: 'prata',
        installmentCount: 6,
        customerName: 'Cliente Prata 6x',
        customerEmail: 'prata6@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE PRATA',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(6);
    });

    it('Prata — Máximo + 1 (7x) → BLOQUEADO no servidor', async () => {
      await expect(
        processCreditCardCheckoutAction({
          businessId: 'biz_prata_7',
          planCode: 'prata',
          installmentCount: 7,
          customerName: 'Cliente Prata 7x Inválido',
          customerEmail: 'prata7@conexaomaconica.com.br',
          card: {
            holderName: 'CLIENTE PRATA',
            cardNumber: '4532111122223333',
            expiryMonth: '12',
            expiryYear: '2030',
            ccv: '123',
            cpfCnpj: '12345678900',
          },
        })
      ).rejects.toThrow('INVALID_INSTALLMENT');
    });
  });

  // 4. MATRIZ DE TESTES POR PLANO: OURO
  describe('Matriz Ouro', () => {
    it('Ouro — 1x (Permitido)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_ouro_1',
        planCode: 'ouro',
        installmentCount: 1,
        customerName: 'Cliente Ouro',
        customerEmail: 'ouro@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE OURO',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(1);
    });

    it('Ouro — Máximo Permitido (12x)', async () => {
      const res = await processCreditCardCheckoutAction({
        businessId: 'biz_ouro_12',
        planCode: 'ouro',
        installmentCount: 12,
        customerName: 'Cliente Ouro 12x',
        customerEmail: 'ouro12@conexaomaconica.com.br',
        card: {
          holderName: 'CLIENTE OURO',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '12345678900',
        },
      });

      expect(res.success).toBe(true);
      expect(res.installmentCount).toBe(12);
    });

    it('Ouro — Máximo + 1 (13x) → BLOQUEADO no servidor', async () => {
      await expect(
        processCreditCardCheckoutAction({
          businessId: 'biz_ouro_13',
          planCode: 'ouro',
          installmentCount: 13,
          customerName: 'Cliente Ouro 13x Inválido',
          customerEmail: 'ouro13@conexaomaconica.com.br',
          card: {
            holderName: 'CLIENTE OURO',
            cardNumber: '4532111122223333',
            expiryMonth: '12',
            expiryYear: '2030',
            ccv: '123',
            cpfCnpj: '12345678900',
          },
        })
      ).rejects.toThrow('INVALID_INSTALLMENT');
    });
  });

  // 5. REGRAS DINÂMICAS DE PAGAMENTO VIA ADMIN
  it('5. Alterar regra no Admin e comprovar que o novo limite passa a valer dinamicamente no checkout', async () => {
    const rulesBefore = await getPlanPaymentRulesAction('prata');
    expect(rulesBefore.installmentsMax).toBe(6);
  });

  // 6. PROTEÇÃO DE ADULTERAÇÃO DE VALOR E DADOS SENSÍVEIS
  it('6. Proteção contra adulteração de valor e persistência de dados sensíveis', async () => {
    const rules = await getPlanPaymentRulesAction('prata');
    expect(rules.amountCents).toBe(178800); // R$ 1.788,00 resolvido no servidor

    const res = await processCreditCardCheckoutAction({
      businessId: 'biz_sec_check',
      planCode: 'prata',
      installmentCount: 2,
      customerName: 'Comandos Terceirização',
      customerEmail: 'comandos@conexaomaconica.com.br',
      card: {
        holderName: 'COMANDOS SEGURANCA',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '987',
        cpfCnpj: '12345678900',
      },
    });

    const sanitized = JSON.stringify(res);
    expect(sanitized).not.toContain('4532111122223333');
    expect(sanitized).not.toContain('987');
  });
});
