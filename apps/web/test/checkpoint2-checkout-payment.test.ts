import { describe, it, expect } from 'vitest';
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
        planCode: 'prata', // Max 6x
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
          cardNumber: '123', // Inválido
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
      installmentCount: 2,
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

    const resString = JSON.stringify(res);
    expect(resString).not.toContain('4532111122223333');
    expect(resString).not.toContain('123');
  });

  it('7. Retorna regras de parcelamento vigentes do servidor', async () => {
    const rulesPrata = await getPlanPaymentRulesAction('prata');
    expect(rulesPrata.installmentsMax).toBe(6);
    expect(rulesPrata.interestFreeInstallments).toBeGreaterThanOrEqual(1);

    const rulesOuro = await getPlanPaymentRulesAction('ouro');
    expect(rulesOuro.installmentsMax).toBe(12);
  });
});
