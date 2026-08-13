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
  priceAnnual: number;
  priceMonthly: number;
  badge?: string;
  isPopular?: boolean;
  features: PlanFeature[];
}

export const DEFAULT_PLANS: Record<PlanTier, Omit<CommercialPlan, 'id' | 'priceAnnual' | 'priceMonthly'> & { defaultPriceAnnual: number; defaultPriceMonthly: number }> = {
  bronze: {
    tier: 'bronze',
    name: 'Plano Bronze',
    tagline: 'Presença essencial no guia comercial fraterno',
    defaultPriceAnnual: 0,
    defaultPriceMonthly: 0,
    features: [
      { text: 'Listagem no Guia Comercial', included: true },
      { text: 'Telefone e Endereço visíveis', included: true },
      { text: 'Link para Redes Sociais', included: true },
      { text: 'Selo de Membro Maçônico', included: false },
      { text: 'Destaque nos Resultados de Busca', included: false },
      { text: 'Banners Publicitários', included: false },
      { text: 'Suporte Prioritário Via WhatsApp', included: false },
    ],
  },
  prata: {
    tier: 'prata',
    name: 'Plano Prata',
    tagline: 'Visibilidade destacada e maior engajamento fraterno',
    defaultPriceAnnual: 299,
    defaultPriceMonthly: 29.9,
    badge: 'Mais Escolhido',
    isPopular: true,
    features: [
      { text: 'Listagem no Guia Comercial', included: true },
      { text: 'Telefone, Endereço e WhatsApp Direct', included: true },
      { text: 'Link para Redes Sociais e Website', included: true },
      { text: 'Selo de Membro Maçônico Verificado', included: true },
      { text: 'Destaque nos Resultados de Busca', included: true },
      { text: 'Até 3 Fotos na Galeria do Anúncio', included: true },
      { text: 'Banners Publicitários', included: false },
      { text: 'Suporte Prioritário Via WhatsApp', included: false },
    ],
  },
  ouro: {
    tier: 'ouro',
    name: 'Plano Ouro',
    tagline: 'Cobertura completa, topo das buscas e anúncios em destaque',
    defaultPriceAnnual: 499,
    defaultPriceMonthly: 49.9,
    badge: 'Máxima Visibilidade',
    features: [
      { text: 'Listagem no Guia Comercial', included: true },
      { text: 'Telefone, Endereço e WhatsApp Direct', included: true },
      { text: 'Link para Redes Sociais e Website', included: true },
      { text: 'Selo de Membro Maçônico Verificado', included: true },
      { text: 'Destaque Prioritário (1º Lugar nas Buscas)', included: true },
      { text: 'Galeria de Fotos Ilimitada + Vídeo Promo', included: true },
      { text: 'Banners Publicitários na Home e Categoria', included: true },
      { text: 'Suporte Prioritário 24/7 Via WhatsApp', included: true },
    ],
  },
};

export async function fetchTenantPlans(
  supabase: SupabaseClient,
  tenantId?: string | null
): Promise<CommercialPlan[]> {
  const result: CommercialPlan[] = [
    {
      id: 'plan-bronze',
      ...DEFAULT_PLANS.bronze,
      priceAnnual: DEFAULT_PLANS.bronze.defaultPriceAnnual,
      priceMonthly: DEFAULT_PLANS.bronze.defaultPriceMonthly,
    },
    {
      id: 'plan-prata',
      ...DEFAULT_PLANS.prata,
      priceAnnual: DEFAULT_PLANS.prata.defaultPriceAnnual,
      priceMonthly: DEFAULT_PLANS.prata.defaultPriceMonthly,
    },
    {
      id: 'plan-ouro',
      ...DEFAULT_PLANS.ouro,
      priceAnnual: DEFAULT_PLANS.ouro.defaultPriceAnnual,
      priceMonthly: DEFAULT_PLANS.ouro.defaultPriceMonthly,
    },
  ];

  if (!tenantId) {
    return result;
  }

  try {
    const { data: tenantPlansData, error } = await supabase
      .from('tenant_plans')
      .select('id, tier, price_annual')
      .eq('tenant_id', tenantId);

    if (error || !tenantPlansData || tenantPlansData.length === 0) {
      return result;
    }

    return result.map((plan) => {
      const dbPlan = tenantPlansData.find((tp) => tp.tier === plan.tier);
      if (dbPlan && typeof dbPlan.price_annual === 'number') {
        const annualPrice = dbPlan.price_annual;
        const monthlyPrice = Number((annualPrice / 10).toFixed(2)); // ~10% monthly equivalency
        return {
          ...plan,
          id: typeof dbPlan.id === 'string' ? dbPlan.id : plan.id,
          priceAnnual: annualPrice,
          priceMonthly: monthlyPrice,
        };
      }
      return plan;
    });
  } catch {
    return result;
  }
}
