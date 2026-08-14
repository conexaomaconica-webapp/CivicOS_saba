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
  features: PlanFeature[];
}

export function computeMonthlyEquivalenceText(annualPriceCents: number): string {
  if (annualPriceCents === 0) return 'Grátis';
  const monthlyEquivalenceInReais = Math.round(annualPriceCents / 12) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(monthlyEquivalenceInReais) + '/mês';
}

export function formatCentsToReais(amountCents: number): string {
  if (amountCents === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amountCents / 100);
}

export const CANONICAL_PLANS: Record<PlanTier, Omit<CommercialPlan, 'id'>> = {
  bronze: {
    tier: 'bronze',
    name: 'Plano Bronze',
    tagline: 'Perfil completo + geolocalização e 1 foto',
    currency: 'BRL',
    annualPriceCents: 50000,   // R$ 500,00
    monthlyPriceCents: 5000,   // R$ 50,00
    features: [
      { text: 'Perfil completo + geolocalização, 1 foto, bio, contato', included: true },
      { text: 'Catálogo: até 5 itens (marketplace)', included: true },
      { text: 'Posicionamento padrão nas buscas', included: true },
      { text: 'Mídia (vídeos / PDF) e cupons', included: false },
      { text: 'Selo de verificação Ouro', included: false },
    ],
  },
  prata: {
    tier: 'prata',
    name: 'Plano Prata',
    tagline: 'Visibilidade destacada, mídia, vídeos e cupons',
    currency: 'BRL',
    annualPriceCents: 80000,   // R$ 800,00
    monthlyPriceCents: 8000,   // R$ 80,00
    badge: 'Mais Escolhido',
    isPopular: true,
    features: [
      { text: 'Tudo do Bronze + 3 fotos', included: true },
      { text: 'Catálogo: até 20 itens (marketplace)', included: true },
      { text: 'Mídia (vídeos / PDF) e cupons', included: true },
      { text: 'Posicionamento relevante nas buscas', included: true },
      { text: 'Selo de verificação Ouro', included: false },
    ],
  },
  ouro: {
    tier: 'ouro',
    name: 'Plano Ouro',
    tagline: 'Topo das buscas, banner rotativo e prioridade máxima',
    currency: 'BRL',
    annualPriceCents: 100000,  // R$ 1.000,00
    monthlyPriceCents: 10000,  // R$ 100,00
    badge: 'Máxima Visibilidade',
    features: [
      { text: 'Tudo do Prata + 5 fotos / vídeo', included: true },
      { text: 'Catálogo ilimitado (marketplace)', included: true },
      { text: 'Banner rotativo na home', included: true },
      { text: 'Prioridade máxima + leads prioritários', included: true },
      { text: 'Selo de verificação Ouro', included: true },
    ],
  },
};

export async function fetchTenantPlans(
  supabase: SupabaseClient,
  tenantId?: string | null
): Promise<CommercialPlan[]> {
  const defaultList: CommercialPlan[] = [
    { id: 'plan-bronze', ...CANONICAL_PLANS.bronze },
    { id: 'plan-prata', ...CANONICAL_PLANS.prata },
    { id: 'plan-ouro', ...CANONICAL_PLANS.ouro },
  ];

  if (!tenantId) {
    return defaultList;
  }

  // Consulta ao Supabase
  const { data: tenantPlansData, error } = await supabase
    .from('tenant_plans')
    .select('id, tier, price_annual')
    .eq('tenant_id', tenantId);

  // Erro de infraestrutura/banco ➔ lança exceção (NÃO esconde falha com fallback silencioso)
  if (error) {
    throw new Error(`INFRASTRUCTURE_ERROR: Falha ao carregar planos do banco de dados: ${error.message}`);
  }

  // Ausência legítima de customização do tenant ➔ retorna catálogo canônico
  if (!tenantPlansData || tenantPlansData.length === 0) {
    return defaultList;
  }

  return defaultList.map((plan) => {
    const dbPlan = tenantPlansData.find((tp) => tp.tier === plan.tier);
    if (dbPlan && typeof dbPlan.price_annual === 'number') {
      const annualCents = Math.round(dbPlan.price_annual * 100);
      const monthlyCents = Math.round(annualCents / 10);
      return {
        ...plan,
        id: typeof dbPlan.id === 'string' ? dbPlan.id : plan.id,
        annualPriceCents: annualCents,
        monthlyPriceCents: monthlyCents,
      };
    }
    return plan;
  });
}
