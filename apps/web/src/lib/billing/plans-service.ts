import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanTier = 'bronze' | 'prata' | 'ouro';
export type BillingCycle = 'annual' | 'monthly';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface CommercialPlan {
  id: string;
  tier: PlanTier;
  name: string;
  tagline: string;
  currency: 'BRL';
  annualPriceCents: number;
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
    name: 'Plano Bronze',
    tagline: 'Entrada gratuita no Guia Maçônico',
    currency: 'BRL',
    annualPriceCents: 0,
    monthlyPriceCents: 0,
    installmentsMax: 3,
    features: [
      { text: 'Presença básica no Guia Comercial', included: true },
      { text: 'Até 3 Fotos na Galeria', included: true },
      { text: 'Até 2 Serviços cadastrados', included: true },
      { text: '1 Oferta/Benefício ativo', included: true },
      { text: 'Parcelamento em até 3x sem juros', included: true },
    ],
  },
  prata: {
    tier: 'prata',
    name: 'Plano Prata',
    tagline: 'Excelente visibilidade comercial e mídias',
    currency: 'BRL',
    annualPriceCents: 178800,
    monthlyPriceCents: 14900,
    badge: 'Mais Escolhido',
    isPopular: true,
    installmentsMax: 6,
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
    name: 'Plano Ouro',
    tagline: 'Máxima presença, topo do guia e analytics',
    currency: 'BRL',
    annualPriceCents: 238800,
    monthlyPriceCents: 19900,
    badge: 'Máxima Visibilidade',
    installmentsMax: 12,
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
    .select('plan_code, amount_cents, installments_max, interest_free_installments, title, slogan, is_popular, commercial_features')
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
  bronze: { ['gallery_photos_limit']: 3, ['services_limit']: 3, ['benefits_limit']: 0, ['events_limit']: 0, ['posts_limit']: 0 },
  prata: { ['gallery_photos_limit']: 6, ['services_limit']: 5, ['benefits_limit']: 3, ['events_limit']: 2, ['posts_limit']: 2 },
  ouro: { ['gallery_photos_limit']: 10, ['services_limit']: 10, ['benefits_limit']: 5, ['events_limit']: 10, ['posts_limit']: 10 },
};

export function getCanonicalDefaultLimit(planCode: string, featureCode: string): number {
  const norm = (planCode || 'bronze').toLowerCase();
  return CANONICAL_FEATURE_LIMITS[norm]?.[featureCode] ?? 0;
}

