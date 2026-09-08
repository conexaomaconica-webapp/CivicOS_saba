// Configurações e Regras de Parcelamento (Tipagem e Regras Canônicas Compartilhadas)

export interface PlanPaymentRules {
  planCode: string;
  amountCents: number;
  paymentMethodsAllowed: string[];
  installmentsMax: number;
  interestFreeInstallments: number;
}

export const CANONICAL_PLAN_PAYMENT_RULES: Record<string, PlanPaymentRules> = {
  bronze: {
    planCode: 'bronze',
    amountCents: 0,
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 3,
    interestFreeInstallments: 3,
  },
  prata: {
    planCode: 'prata',
    amountCents: 178800, // R$ 1.788,00 / ano (6x R$ 298,00)
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 6,
    interestFreeInstallments: 6,
  },
  ouro: {
    planCode: 'ouro',
    amountCents: 238800, // R$ 2.388,00 / ano (12x R$ 199,00)
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 12,
    interestFreeInstallments: 12,
  },
};
