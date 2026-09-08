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

import { processPixCheckoutAction, processCreditCardCheckoutAction, getPlanPaymentRulesAction } from '../src/lib/payment/payment-service';

describe('Checkpoint 2 — Checkout Real PIX + Cartão de Crédito Parcelado', () => {
  it('1. PIX Creation & QR Code Copy-and-Paste generation', async () => {
    const res = await processPixCheckoutAction({
      businessId: 'biz_test_101',
      planCode: 'prata',
      customerName: 'Empresa Teste',
      customerEmail: 'teste@conexaomaconica.com.br',
    });

    expect(res.success).toBe(true);
    expect(res.pixCopiaECola).toBeDefined();
    expect(res.pixCopiaECola.length).toBeGreaterThan(15);
    expect(res.status).toBe('Aguardando pagamento');
  });

  it('2. Credit Card 1x processing via server payment provider', async () => {
    const res = await processCreditCardCheckoutAction({
      businessId: 'biz_test_101',
      planCode: 'prata',
      installmentCount: 1,
      customerName: 'Eduardo Saba',
      customerEmail: 'teste@conexaomaconica.com.br',
      card: {
        holderName: 'EDUARDO P SABA',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
        cpfCnpj: '123.456.789-00',
      },
    });

    expect(res.success).toBe(true);
    expect(res.installmentCount).toBe(1);
    expect(res.status).toBeDefined();
  });

  it('3. Credit Card Installments (e.g. 6x) validation', async () => {
    const res = await processCreditCardCheckoutAction({
      businessId: 'biz_test_101',
      planCode: 'prata',
      installmentCount: 6,
      customerName: 'Eduardo Saba',
      customerEmail: 'teste@conexaomaconica.com.br',
      card: {
        holderName: 'EDUARDO P SABA',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
        cpfCnpj: '123.456.789-00',
      },
    });

    expect(res.success).toBe(true);
    expect(res.installmentCount).toBe(6);
  });

  it('4. Server-side Installment Rule Blocks Invalid Installments (e.g. 10x on Prata max 6x)', async () => {
    await expect(
      processCreditCardCheckoutAction({
        businessId: 'biz_test_101',
        planCode: 'prata',
        installmentCount: 10,
        customerName: 'Eduardo Saba',
        customerEmail: 'teste@conexaomaconica.com.br',
        card: {
          holderName: 'EDUARDO P SABA',
          cardNumber: '4532111122223333',
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '123.456.789-00',
        },
      })
    ).rejects.toThrow('INVALID_INSTALLMENT');
  });

  it('5. Server-side Validation Blocks Invalid Card Numbers', async () => {
    await expect(
      processCreditCardCheckoutAction({
        businessId: 'biz_test_101',
        planCode: 'prata',
        installmentCount: 1,
        customerName: 'Eduardo Saba',
        customerEmail: 'teste@conexaomaconica.com.br',
        card: {
          holderName: 'EDUARDO P SABA',
          cardNumber: '1234', // Número inválido
          expiryMonth: '12',
          expiryYear: '2030',
          ccv: '123',
          cpfCnpj: '123.456.789-00',
        },
      })
    ).rejects.toThrow('INVALID_CARD_NUMBER');
  });

  it('6. Verifica que dados sensíveis de cartão NUNCA são gravados no retorno', async () => {
    const res = await processCreditCardCheckoutAction({
      businessId: 'biz_test_101',
      planCode: 'prata',
      installmentCount: 1,
      customerName: 'Eduardo Saba',
      customerEmail: 'teste@conexaomaconica.com.br',
      card: {
        holderName: 'EDUARDO P SABA',
        cardNumber: '4532111122223333',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '789',
        cpfCnpj: '123.456.789-00',
      },
    });

    const sanitized = JSON.stringify(res);
    expect(sanitized).not.toContain('4532111122223333');
    expect(sanitized).not.toContain('789');
  });
});
