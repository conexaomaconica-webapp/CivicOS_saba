import { describe, it, expect } from 'vitest';
import {
  getPlanPaymentRulesAction,
  updatePlanPaymentRulesAdminAction,
  processCreditCardCheckoutAction,
} from '../src/lib/payment/payment-service';

describe('ADMIN CM — CHECKPOINT 3: Admin de Condições de Pagamento e Parcelamento', () => {
  it('1. Retorna regras de parcelamento do servidor com diferenciação de installments_max e interest_free_installments', async () => {
    const rulesPrata = await getPlanPaymentRulesAction('prata');
    expect(rulesPrata).toBeDefined();
    expect(rulesPrata.installmentsMax).toBe(6);
    expect(rulesPrata.interestFreeInstallments).toBe(6);

    const rulesOuro = await getPlanPaymentRulesAction('ouro');
    expect(rulesOuro.installmentsMax).toBe(12);
    expect(rulesOuro.interestFreeInstallments).toBe(12);
  });

  it('2. Permite ao Administrador atualizar dinamicamente installments_max e interest_free_installments no servidor', async () => {
    const updateRes = await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 8,
      interestFreeInstallments: 4,
      paymentMethodsAllowed: ['pix', 'credit_card'],
    });

    expect(updateRes.success).toBe(true);

    const updatedRules = await getPlanPaymentRulesAction('prata');
    expect(updatedRules.installmentsMax).toBe(8);
    expect(updatedRules.interestFreeInstallments).toBe(4);
  });

  it('3. Valida no servidor o novo limite de parcelas configurado dinamicamente no admin', async () => {
    // Atualiza Prata para max 8x
    await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 8,
      interestFreeInstallments: 6,
    });

    // 8x deve ser aceito
    const validRes = await processCreditCardCheckoutAction({
      businessId: 'biz_admin_test',
      planCode: 'prata',
      installmentCount: 8,
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
    expect(validRes.success).toBe(true);
    expect(validRes.installmentCount).toBe(8);

    // 10x deve ser bloqueado no servidor
    await expect(
      processCreditCardCheckoutAction({
        businessId: 'biz_admin_test',
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
});
