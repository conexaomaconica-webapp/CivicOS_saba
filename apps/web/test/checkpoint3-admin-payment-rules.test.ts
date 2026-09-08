import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock commercial eligibility gate and access authorization
vi.mock('@/lib/payment/commercial-eligibility-gate', () => ({
  assertBusinessCommercialEligibility: vi.fn().mockResolvedValue({
    eligible: true,
    masonicVerified: true,
    contractSigned: false,
    reasons: [],
  }),
}));

// Stateful in-memory mock store for plan payment rules
let dynamicRulesStore: Record<string, any> = {
  prata: {
    plan_code: 'prata',
    title: 'Plano Prata',
    amount_cents: 178800,
    installments_max: 6,
    interest_free_installments: 6,
    payment_methods_allowed: ['pix', 'credit_card'],
  },
  ouro: {
    plan_code: 'ouro',
    title: 'Plano Ouro',
    amount_cents: 238800,
    installments_max: 12,
    interest_free_installments: 12,
    payment_methods_allowed: ['pix', 'credit_card'],
  },
};

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    get: () => undefined, getAll: () => [], set: () => {}, delete: () => {},
  }),
}));

const chainable = (tableName: string) => {
  const c: any = {
    select: () => c,
    insert: () => c,
    update: () => c,
    upsert: (payload: any) => {
      if (payload && payload.plan_code) {
        dynamicRulesStore[payload.plan_code] = {
          ...dynamicRulesStore[payload.plan_code],
          ...payload,
        };
      }
      return Promise.resolve({ data: payload, error: null });
    },
    delete: () => c,
    eq: (col: string, val: string) => {
      if (col === 'plan_code' && dynamicRulesStore[val]) {
        c._currentResult = dynamicRulesStore[val];
      }
      return c;
    },
    neq: () => c, gt: () => c, gte: () => c, lt: () => c, lte: () => c,
    like: () => c, ilike: () => c, is: () => c, in: () => c, or: () => c, not: () => c,
    contains: () => c, containedBy: () => c, filter: () => c, match: () => c,
    order: () => c, limit: () => c, range: () => c,
    single: () => Promise.resolve({ data: c._currentResult || null, error: null }),
    maybeSingle: () => Promise.resolve({ data: c._currentResult || null, error: null }),
    then: (r: any) => r({ data: c._currentResult ? [c._currentResult] : [], error: null }),
  };
  return c;
};

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: '00000000-0000-0000-0000-000000000099', email: 'admin@cm.com.br' } },
        error: null,
      }),
    },
    rpc: (fnName: string, args: any) => {
      if (fnName === 'has_platform_admin_access') return Promise.resolve({ data: true, error: null });
      if (fnName === 'admin_update_plan_payment_rule') {
        if (args && args.p_plan_code) {
          dynamicRulesStore[args.p_plan_code] = {
            ...dynamicRulesStore[args.p_plan_code],
            plan_code: args.p_plan_code,
            amount_cents: args.p_amount_cents,
            installments_max: args.p_installments_max,
            interest_free_installments: args.p_interest_free_installments,
          };
        }
        return Promise.resolve({ data: { ok: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => chainable(table),
  })),
}));

import {
  getPlanPaymentRulesAction,
  updatePlanPaymentRulesAdminAction,
  processCreditCardCheckoutAction,
} from '../src/lib/payment/payment-service';

describe('ADMIN CM — CHECKPOINT 3: Admin de Condições de Pagamento e Parcelamento (STATEFUL MOCK)', () => {
  beforeEach(() => {
    // Reset store to initial defaults before each test
    dynamicRulesStore = {
      prata: {
        plan_code: 'prata',
        title: 'Plano Prata',
        amount_cents: 178800,
        installments_max: 6,
        interest_free_installments: 6,
        payment_methods_allowed: ['pix', 'credit_card'],
      },
      ouro: {
        plan_code: 'ouro',
        title: 'Plano Ouro',
        amount_cents: 238800,
        installments_max: 12,
        interest_free_installments: 12,
        payment_methods_allowed: ['pix', 'credit_card'],
      },
    };
  });

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

  it('3. Valida no servidor o novo limite de parcelas configurado dinamicamente no admin e o aplica no checkout', async () => {
    // Atualiza Prata para max 8x
    await updatePlanPaymentRulesAdminAction({
      planCode: 'prata',
      amountCents: 178800,
      installmentsMax: 8,
      interestFreeInstallments: 6,
    });

    // 8x no Prata agora DEVE ser aceito pois o Admin aumentou o limite para 8x
    const validRes = await processCreditCardCheckoutAction({
      businessId: '00000000-0000-0000-0000-000000000001',
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

    // 10x deve continuar sendo bloqueado no servidor
    await expect(
      processCreditCardCheckoutAction({
        businessId: '00000000-0000-0000-0000-000000000001',
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
