// Configurações e Regras de Parcelamento (Tipagem e Regras Canônicas Compartilhadas)

export interface PlanPaymentRules {
  planCode: string;
  amountCents: number;
  pixAmountCents: number;
  paymentMethodsAllowed: string[];
  installmentsMax: number;
  interestFreeInstallments: number;
}

export const CANONICAL_PLAN_PAYMENT_RULES: Record<string, PlanPaymentRules> = {
  bronze: {
    planCode: 'bronze',
    amountCents: 0,
    pixAmountCents: 0,
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 3,
    interestFreeInstallments: 3,
  },
  prata: {
    planCode: 'prata',
    amountCents: 178800, // R$ 1.788,00 / ano (6x R$ 298,00)
    pixAmountCents: 178800,
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 6,
    interestFreeInstallments: 6,
  },
  ouro: {
    planCode: 'ouro',
    amountCents: 238800, // R$ 2.388,00 / ano (12x R$ 199,00)
    pixAmountCents: 238800,
    paymentMethodsAllowed: ['pix', 'credit_card'],
    installmentsMax: 12,
    interestFreeInstallments: 12,
  },
};

/**
 * Calcula o número máximo de parcelas permitidas para o cartão de crédito no checkout/contratação.
 * Garante que:
 * - O Plano Acácia com Pedra Fundamental (ou qualquer contrato com reconhecimento de honra Pedra Fundamental) permita até 4x no cartão.
 * - Os planos comerciais respeitem o teto comercial acordado ou o teto padrão do plano (Ouro/Acácia: até 4x, Compasso: até 3x, Esquadro: até 2x).
 * - Nunca retorne menos que 1 ou limite artificialmente a 1x se o plano admitir parcelamento.
 */
export function getCheckoutMaxInstallments(params: {
  installmentsCount?: number | null;
  planCode?: string | null;
  planName?: string | null;
  isPedraFundamental?: boolean | null;
}): number {
  const { installmentsCount = 1, planCode = '', planName = '', isPedraFundamental = false } = params;
  const count = Number(installmentsCount) || 1;

  // Reconhecimento / Promoção de Lançamento Pedra Fundamental (Plano Acácia bienal): até 4x
  if (isPedraFundamental || (planName && planName.toLowerCase().includes('pedra fundamental'))) {
    return Math.max(4, count);
  }

  const normalized = `${planCode || ''} ${planName || ''}`.toLowerCase();
  if (normalized.includes('ouro') || normalized.includes('acacia') || normalized.includes('acácia')) {
    return Math.max(4, count);
  }
  if (normalized.includes('prata') || normalized.includes('compasso')) {
    return Math.max(3, count);
  }
  if (normalized.includes('bronze') || normalized.includes('esquadro')) {
    return Math.max(2, count);
  }

  return Math.max(1, count);
}

/**
 * Preços canônicos da Promoção de Lançamento (Plano Acácia com Pedra Fundamental):
 * - À vista (PIX ou Cartão 1x): R$ 1.200,00 (120000 centavos)
 * - Parcelado no Cartão: até 4x, ficando R$ 1.300,00 no total (4x de R$ 325,00 sem juros)
 */
export const PEDRA_FUNDAMENTAL_PRICING = {
  name: 'Plano Acácia (Pedra Fundamental)',
  payInFullCents: 120000,
  installmentTotalCents: 130000,
  installmentsMax: 4,
  installmentValueCents: 32500, // 4x de R$ 325,00 = R$ 1.300,00
} as const;

/**
 * Presets dos planos comerciais vigentes (valores anuais):
 */
export const PLAN_PRESETS = {
  bronze: {
    name: 'Plano Esquadro',
    code: 'bronze',
    payInFullCents: 60000, // R$ 600,00 no PIX
    installmentTotalCents: 63500, // R$ 635,00 no Cartão (2x de R$ 317,50)
    installmentsMax: 2,
    installmentValueCents: 31750,
  },
  prata: {
    name: 'Plano Compasso',
    code: 'prata',
    payInFullCents: 80000, // R$ 800,00 no PIX
    installmentTotalCents: 85500, // R$ 855,00 no Cartão (3x de R$ 285,00)
    installmentsMax: 3,
    installmentValueCents: 28500,
  },
  ouro: {
    name: 'Plano Acácia',
    code: 'ouro',
    payInFullCents: 100000, // R$ 1.000,00 no PIX
    installmentTotalCents: 108000, // R$ 1.080,00 no Cartão (4x de R$ 270,00)
    installmentsMax: 4,
    installmentValueCents: 27000,
  },
} as const;

export interface CheckoutCalculatedAmountResult {
  finalAmountCents: number;
  installmentValueCents: number;
  isDiscountedAvista: boolean;
}

/**
 * Calcula o valor total e o valor das parcelas no checkout e na geração de cobrança:
 * - Para o Plano Acácia com Pedra Fundamental:
 *   - À vista (PIX ou 1x no Cartão): R$ 1.200,00
 *   - Parcelado no Cartão (2x a 4x): R$ 1.300,00 (ex: 4x de R$ 325,00)
 * - Para os planos comerciais regulares:
 *   - À vista (PIX ou 1x no Cartão): valor com desconto à vista (payInFullCents)
 *   - Parcelado no Cartão: valor total parcelado (installmentTotalCents)
 */
export function getCheckoutCalculatedAmount(params: {
  amountCents?: number | null;
  paymentMethod: 'pix' | 'credit_card';
  installmentsCount?: number | null;
  isPedraFundamental?: boolean | null;
  planCode?: string | null;
  planName?: string | null;
}): CheckoutCalculatedAmountResult {
  const {
    amountCents = 0,
    paymentMethod,
    installmentsCount = 1,
    isPedraFundamental = false,
    planCode = '',
    planName = '',
  } = params;

  const count = Math.max(1, Number(installmentsCount) || 1);
  const isPedra = Boolean(
    isPedraFundamental ||
    (planName && planName.toLowerCase().includes('pedra fundamental')) ||
    (planCode && planCode.toLowerCase().includes('pedra_fundamental'))
  );

  // 1. Promoção de Lançamento: Acácia com Pedra Fundamental
  if (isPedra) {
    if (paymentMethod === 'pix') {
      return {
        finalAmountCents: PEDRA_FUNDAMENTAL_PRICING.payInFullCents, // R$ 1.200,00
        installmentValueCents: PEDRA_FUNDAMENTAL_PRICING.payInFullCents,
        isDiscountedAvista: true,
      };
    }
    // No Cartão de Crédito (mesmo 1x ou parcelado em até 4x): R$ 1.300,00 no total
    const finalAmountCents = PEDRA_FUNDAMENTAL_PRICING.installmentTotalCents; // R$ 1.300,00
    const installmentValueCents = Math.round(finalAmountCents / count);
    return {
      finalAmountCents,
      installmentValueCents,
      isDiscountedAvista: false,
    };
  }

  // 2. Planos comerciais regulares
  const normCode = (planCode || '').toLowerCase();
  const normName = (planName || '').toLowerCase();
  let preset: (typeof PLAN_PRESETS)[keyof typeof PLAN_PRESETS] | null = null;

  if (normCode === 'ouro' || normCode === 'acacia' || normName.includes('acácia') || normName.includes('acacia')) {
    preset = PLAN_PRESETS.ouro;
  } else if (normCode === 'prata' || normCode === 'compasso' || normName.includes('compasso')) {
    preset = PLAN_PRESETS.prata;
  } else if (normCode === 'bronze' || normCode === 'esquadro' || normName.includes('esquadro')) {
    preset = PLAN_PRESETS.bronze;
  }

  if (preset) {
    if (paymentMethod === 'pix') {
      return {
        finalAmountCents: preset.payInFullCents,
        installmentValueCents: preset.payInFullCents,
        isDiscountedAvista: true,
      };
    }
    // No Cartão de Crédito (mesmo 1x ou parcelado): valor total de cartão
    const finalAmountCents = preset.installmentTotalCents;
    const installmentValueCents = Math.round(finalAmountCents / count);
    return {
      finalAmountCents,
      installmentValueCents,
      isDiscountedAvista: false,
    };
  }

  // Fallback: mantém baseAmount configurado
  const base = Number(amountCents) || 0;
  return {
    finalAmountCents: base,
    installmentValueCents: Math.round(base / count),
    isDiscountedAvista: count === 1,
  };
}
