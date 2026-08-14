import type { BillingCycle, CommercialPlan, PlanTier } from '@/lib/billing/plans-service';
import { formatCnpj } from '@/lib/onboarding/onboarding-validation';

// ---------------------------------------------------------------------------
// ADV-004 (CRIT-VSC-005) — W4: Resumo Comercial. Helpers puros para montar o
// resumo financeiro e as condições contratuais exibidos na etapa.
// ---------------------------------------------------------------------------

export interface CommercialSummaryInput {
  plan: CommercialPlan | null;
  cycle: BillingCycle;
  business: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    categoryName: string | null;
  } | null;
  responsible: {
    name: string;
    relationship: 'owner' | 'representative';
  } | null;
}

export interface CommercialSummary {
  planName: string | null;
  tier: PlanTier | null;
  cycleLabel: string;
  cycle: BillingCycle;
  price: number;
  priceFormatted: string;
  business: {
    name: string | null;
    legalName: string | null;
    cnpjDisplay: string | null;
    categoryName: string | null;
  };
  responsible: {
    name: string | null;
    relationshipLabel: string | null;
  };
  conditions: string[];
}

export function formatCurrencyBRL(amount: number): string {
  if (amount === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(amount)
    .replace(/\u00A0/g, ' ');
}

export function getBillingCycleLabel(cycle: BillingCycle): string {
  return cycle === 'annual' ? 'Anual' : 'Mensal';
}

export const RESPONSIBLE_RELATIONSHIP_SHORT: Record<'owner' | 'representative', string> = {
  owner: 'Proprietário / Sócio Direto',
  representative: 'Representante Comercial / Procurador',
};

// Condições contratuais exibidas no resumo (CRIT-VSC-005/006) — texto canonizado
// para a etapa W4; a minuta formal e a assinatura (hash SHA-256) são tratadas no
// passo seguinte (ADV-005).
export const CONTRACTUAL_CONDITIONS: string[] = [
  'Contratação com vigência conforme o ciclo escolhido (mensal ou anual).',
  'Valores recorrentes cobrados no início de cada ciclo de faturamento.',
  'Publicação no Guia sujeita à aprovação da moderação do tenant (CRIT-VSC-009).',
  'Dados informados são de responsabilidade do anunciante (CRIT-VSC-003).',
  'A formalização ocorre por assinatura eletrônica com hash de integridade SHA-256 (CRIT-VSC-006).',
];

export function buildCommercialSummary(input: CommercialSummaryInput): CommercialSummary {
  const priceCents = input.plan
    ? input.cycle === 'annual'
      ? input.plan.annualPriceCents
      : input.plan.monthlyPriceCents
    : 0;
  const price = priceCents / 100;

  return {
    planName: input.plan?.name ?? null,
    tier: input.plan?.tier ?? null,
    cycleLabel: getBillingCycleLabel(input.cycle),
    cycle: input.cycle,
    price,
    priceFormatted: formatCurrencyBRL(price),
    business: {
      name: input.business?.name ?? null,
      legalName: input.business?.legalName ?? null,
      cnpjDisplay:
        input.business?.cnpj != null ? formatCnpj(input.business.cnpj) : null,
      categoryName: input.business?.categoryName ?? null,
    },
    responsible: {
      name: input.responsible?.name ?? null,
      relationshipLabel: input.responsible
        ? RESPONSIBLE_RELATIONSHIP_SHORT[input.responsible.relationship]
        : null,
    },
    conditions: CONTRACTUAL_CONDITIONS,
  };
}