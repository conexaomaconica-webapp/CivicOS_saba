'use server';

import { createClient } from '@supabase/supabase-js';
import { AsaasPaymentProvider } from './asaas-payment-provider';
import { CreditCardPayload, PixChargeResult, CreditCardChargeResult } from './payment-provider.interface';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

// Configurações e Regras de Parcelamento no Servidor (Fonte de Verdade)
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
    amountCents: 178800, // R$ 1.788,00 / ano (12x R$ 149,00)
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

const paymentProvider = new AsaasPaymentProvider();

// Action 1: Criar Cobrança PIX
export async function processPixCheckoutAction(payload: {
  businessId: string;
  planCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  cpfCnpj?: string;
}): Promise<PixChargeResult> {
  const rules = await getPlanPaymentRulesAction(payload.planCode);
  const idempotencyKey = `pix_${payload.businessId}_${rules.planCode}`;

  return await paymentProvider.createPixCharge(
    {
      businessId: payload.businessId,
      planCode: rules.planCode,
      amountCents: rules.amountCents,
      description: `Assinatura Guia Conexão Maçônica - ${rules.planCode.toUpperCase()}`,
      idempotencyKey,
    },
    {
      name: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
      cpfCnpj: payload.cpfCnpj,
    }
  );
}

// Action 2: Processar Cartão de Crédito Parcelado no Backend (SEM NUNCA SALVAR O CARTÃO OU GERAR LOG SENSÍVEL)
export async function processCreditCardCheckoutAction(payload: {
  businessId: string;
  planCode: string;
  installmentCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  card: CreditCardPayload;
}): Promise<CreditCardChargeResult> {
  const rules = await getPlanPaymentRulesAction(payload.planCode);

  // VALIDAÇÃO ESTRITA NO SERVIDOR DO NÚMERO DE PARCELAS
  if (payload.installmentCount > rules.installmentsMax) {
    throw new Error(
      `INVALID_INSTALLMENT: O plano ${rules.planCode.toUpperCase()} permite no máximo ${rules.installmentsMax}x parcelas.`
    );
  }

  if (payload.installmentCount < 1) {
    throw new Error('INVALID_INSTALLMENT: O número de parcelas deve ser de pelo menos 1x.');
  }

  // Validação dos dados do cartão
  if (!payload.card.cardNumber || payload.card.cardNumber.replace(/\D/g, '').length < 13) {
    throw new Error('INVALID_CARD_NUMBER: Número de cartão de crédito inválido.');
  }

  if (!payload.card.ccv || payload.card.ccv.trim().length < 3) {
    throw new Error('INVALID_CARD_CCV: Código de segurança (CVV) inválido.');
  }

  const idempotencyKey = `card_${payload.businessId}_${rules.planCode}_${payload.installmentCount}x`;

  // Executa processamento de cartão no gateway
  const result = await paymentProvider.createCreditCardCharge(
    {
      businessId: payload.businessId,
      planCode: rules.planCode,
      amountCents: rules.amountCents,
      description: `Assinatura Guia Conexão Maçônica - ${rules.planCode.toUpperCase()} (${payload.installmentCount}x)`,
      installmentCount: payload.installmentCount,
      idempotencyKey,
    },
    {
      name: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
      cpfCnpj: payload.card.cpfCnpj,
    },
    payload.card
  );

  return result;
}

// Action 3: Obter Regras de Pagamento do Servidor (Do Banco Supabase ou Fallback)
export async function getPlanPaymentRulesAction(planCode: string): Promise<PlanPaymentRules> {
  const key = (planCode || 'prata').toLowerCase();
  const defaultRule = CANONICAL_PLAN_PAYMENT_RULES[key] || CANONICAL_PLAN_PAYMENT_RULES['prata']!;

  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase
      .from('plan_payment_rules')
      .select('*')
      .eq('plan_code', key)
      .maybeSingle();

    if (data) {
      return {
        planCode: data.plan_code,
        amountCents: data.amount_cents ?? defaultRule.amountCents,
        paymentMethodsAllowed: data.payment_methods_allowed ?? defaultRule.paymentMethodsAllowed,
        installmentsMax: data.installments_max ?? defaultRule.installmentsMax,
        interestFreeInstallments: data.interest_free_installments ?? defaultRule.interestFreeInstallments,
      };
    }
  } catch (_e) {
    // Fallback gracioso para regras em memória se banco off
  }

  return defaultRule;
}

// Action 4: Atualizar Regras de Pagamento no Admin
export async function updatePlanPaymentRulesAdminAction(payload: {
  planCode: string;
  amountCents: number;
  installmentsMax: number;
  interestFreeInstallments: number;
  paymentMethodsAllowed?: string[];
}) {
  const supabase = getAdminSupabase();

  let rpcSuccess = false;
  try {
    const { error } = await supabase.rpc('update_plan_payment_rules', {
      p_plan_code: payload.planCode,
      p_amount_cents: payload.amountCents,
      p_installments_max: payload.installmentsMax,
      p_interest_free_installments: payload.interestFreeInstallments,
      p_payment_methods: payload.paymentMethodsAllowed || ['pix', 'credit_card'],
    });
    if (!error) rpcSuccess = true;
  } catch (_e) {
    // Segue para upsert direto
  }

  if (!rpcSuccess) {
    try {
      await supabase.from('plan_payment_rules').upsert({
        plan_code: payload.planCode,
        amount_cents: payload.amountCents,
        installments_max: payload.installmentsMax,
        interest_free_installments: payload.interestFreeInstallments,
        payment_methods_allowed: payload.paymentMethodsAllowed || ['pix', 'credit_card'],
        updated_at: new Date().toISOString(),
      });
    } catch (_err) {
      // Ignora para fallback em memória
    }
  }

  // Atualiza também no objeto em memória local
  if (CANONICAL_PLAN_PAYMENT_RULES[payload.planCode]) {
    CANONICAL_PLAN_PAYMENT_RULES[payload.planCode] = {
      planCode: payload.planCode,
      amountCents: payload.amountCents,
      paymentMethodsAllowed: payload.paymentMethodsAllowed || ['pix', 'credit_card'],
      installmentsMax: payload.installmentsMax,
      interestFreeInstallments: payload.interestFreeInstallments,
    };
  }

  return {
    success: true,
    result: { ok: true },
  };
}
