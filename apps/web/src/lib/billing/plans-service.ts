import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanTier = 'bronze' | 'prata' | 'ouro';
export type BillingCycle = 'annual' | 'monthly';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface CommercialPlan {
  id: string;
  code?: 'esquadro' | 'compasso' | 'acacia';
  payInFullCents?: number;
  installmentTotalCents?: number;
  installmentValueCents?: number;
  tier: PlanTier;
  name: string;
  tagline: string;
  currency: 'BRL';
  annualPriceCents: number;
  pixPriceCents?: number;
  pixDiscountPercentage?: number;
  monthlyPriceCents: number;
  badge?: string;
  isPopular?: boolean;
  installmentsMax?: number;
  features: PlanFeature[];
}

export function computeMonthlyEquivalenceText(annualPriceCents: number): string {
  if (annualPriceCents === 0) return 'Gratuito';
  const monthlyEquivalenceInReais = Math.round(annualPriceCents / 12) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(monthlyEquivalenceInReais) + '/mês';
}

export function formatCentsToReais(amountCents: number): string {
  if (amountCents === 0) return 'Gratuito';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amountCents / 100);
}

export const CANONICAL_PLANS: Record<PlanTier, Omit<CommercialPlan, 'id'>> = {
  bronze: {
    tier: 'bronze',
    name: 'Plano Esquadro',
    code: 'esquadro',
    tagline: 'Presença no Guia Maçônico Oficial',
    currency: 'BRL',
    payInFullCents: 60000,
    installmentTotalCents: 63500,
    annualPriceCents: 60000,
    monthlyPriceCents: 5000,
    installmentsMax: 2,
    installmentValueCents: 31750,
    features: [
      { text: 'Presença básica no Guia Comercial', included: true },
      { text: 'Até 3 Fotos na Galeria', included: true },
      { text: 'Até 2 Serviços cadastrados', included: true },
      { text: 'Parcelamento em até 3x sem juros', included: true },
    ],
  },
  prata: {
    tier: 'prata',
    name: 'Plano Compasso',
    code: 'compasso',
    tagline: 'Excelente visibilidade comercial e mídias',
    currency: 'BRL',
    payInFullCents: 80000,
    installmentTotalCents: 85500,
    annualPriceCents: 80000,
    monthlyPriceCents: 6667,
    badge: 'Mais Escolhido',
    isPopular: true,
    installmentsMax: 3,
    installmentValueCents: 28500,
    features: [
      { text: 'Destaque no Guia Comercial', included: true },
      { text: 'Até 6 Fotos na Galeria', included: true },
      { text: 'Até 5 Serviços cadastrados', included: true },
      { text: 'Até 3 Ofertas/Benefícios ativos', included: true },
      { text: 'Publicação de Eventos e Comunicados', included: true },
      { text: 'Parcelamento em até 6x sem juros', included: true },
    ],
  },
  ouro: {
    tier: 'ouro',
    name: 'Plano Acácia',
    code: 'acacia',
    tagline: 'Máxima presença, topo do guia e analytics',
    currency: 'BRL',
    payInFullCents: 100000,
    installmentTotalCents: 108000,
    annualPriceCents: 100000,
    monthlyPriceCents: 8333,
    badge: 'Máxima Visibilidade',
    installmentsMax: 4,
    installmentValueCents: 27000,
    features: [
      { text: 'Topo das Buscas e Maior Destaque', included: true },
      { text: 'Até 10 Fotos na Galeria', included: true },
      { text: 'Até 10 Serviços cadastrados', included: true },
      { text: 'Até 5 Ofertas/Benefícios ativos', included: true },
      { text: 'Publicação Ilimitada de Eventos', included: true },
      { text: 'Analytics Avançado (7, 30 e 90 dias)', included: true },
      { text: 'Parcelamento em até 12x sem juros', included: true },
    ],
  },
};

export async function fetchTenantPlans(
  supabase: SupabaseClient,
  _tenantId?: string | null
): Promise<CommercialPlan[]> {
  const defaultList: CommercialPlan[] = [
    { id: 'plan-bronze', ...CANONICAL_PLANS.bronze },
    { id: 'plan-prata', ...CANONICAL_PLANS.prata },
    { id: 'plan-ouro', ...CANONICAL_PLANS.ouro },
  ];

  // Busca regras financeiras e apresentação comercial da fonte única (plan_payment_rules)
  const { data: rulesData, error } = await supabase
    .from('plan_payment_rules')
    .select('plan_code, amount_cents, pix_amount_cents, installments_max, interest_free_installments, title, slogan, is_popular, commercial_features')
    .in('plan_code', ['bronze', 'prata', 'ouro']);

  if (error) {
    console.error('Erro ao buscar plan_payment_rules no Supabase:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`SERVICO_INDISPONIVEL: Não foi possível carregar as regras de planos vigentes do banco de dados (${error.message}).`);
    }
    return defaultList;
  }

  if (!rulesData || rulesData.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SERVICO_INDISPONIVEL: Nenhuma regra de plano comercial cadastrada no banco de dados.');
    }
    return defaultList;
  }

  return defaultList.map((plan) => {
    const dbRule = rulesData.find((r) => r.plan_code === plan.tier);
    if (dbRule) {
      const annualCents = dbRule.amount_cents ?? plan.annualPriceCents;
      const pixPriceCents = Math.min(annualCents, Math.max(0, dbRule.pix_amount_cents ?? annualCents));
      const pixDiscountPercentage = annualCents > 0 ? Math.round((1 - pixPriceCents / annualCents) * 100) : 0;
      const monthlyCents = Math.round(annualCents / 12);
      const customFeatures: PlanFeature[] =
        dbRule.commercial_features && dbRule.commercial_features.length > 0
          ? dbRule.commercial_features.map((f: string) => ({ text: f, included: true }))
          : plan.features;

      return {
        ...plan,
        name: dbRule.title || plan.name,
        tagline: dbRule.slogan || plan.tagline,
        annualPriceCents: annualCents,
        pixPriceCents,
        pixDiscountPercentage,
        monthlyPriceCents: monthlyCents,
        isPopular: dbRule.is_popular ?? plan.isPopular,
        installmentsMax: dbRule.installments_max ?? plan.installmentsMax,
        features: customFeatures,
      };
    }
    return plan;
  });
}

export const CANONICAL_FEATURE_LIMITS: Record<string, Record<string, number>> = {
  bronze: { ['gallery_photos_limit']: 1, ['services_limit']: 2, ['benefits_limit']: 0, ['events_limit']: 0, ['posts_limit']: 0, ['business_video_limit']: 0 },
  prata: { ['gallery_photos_limit']: 6, ['services_limit']: 5, ['benefits_limit']: 3, ['events_limit']: 2, ['posts_limit']: 2, ['business_video_limit']: 0 },
  ouro: { ['gallery_photos_limit']: 10, ['services_limit']: 10, ['benefits_limit']: 5, ['events_limit']: 10, ['posts_limit']: 10, ['business_video_limit']: 1 },
};

export function getCanonicalDefaultLimit(planCode: string, featureCode: string): number {
  if (!planCode) return 0;
  const norm = planCode.toLowerCase().trim();
  let key = 'bronze';
  if (norm === 'prata' || norm === 'silver' || norm === 'compasso') key = 'prata';
  else if (norm === 'ouro' || norm === 'gold' || norm === 'acacia' || norm === 'acácia' || norm === 'ouro_founder') key = 'ouro';
  return CANONICAL_FEATURE_LIMITS[key]?.[featureCode] ?? 0;
}

export function getCommercialPlanName(planCode: string): string {
  const code = normalizeCanonicalPlanCode(planCode);
  if (code === 'acacia') return 'Acácia';
  if (code === 'compasso') return 'Compasso';
  return 'Esquadro';
}

export function normalizeCanonicalPlanCode(planCode: string | null | undefined): 'esquadro' | 'compasso' | 'acacia' {
  if (!planCode) return 'esquadro';
  const norm = planCode.toLowerCase().trim();
  if (['ouro', 'gold', 'acacia', 'acácia', 'ouro_founder'].includes(norm)) return 'acacia';
  if (['prata', 'silver', 'compasso'].includes(norm)) return 'compasso';
  return 'esquadro';
}

export function getCanonicalPlanByCode(planCode: string | null | undefined): Omit<CommercialPlan, 'id'> {
  const code = normalizeCanonicalPlanCode(planCode);
  if (code === 'acacia') return CANONICAL_PLANS.ouro;
  if (code === 'compasso') return CANONICAL_PLANS.prata;
  return CANONICAL_PLANS.bronze;
}

