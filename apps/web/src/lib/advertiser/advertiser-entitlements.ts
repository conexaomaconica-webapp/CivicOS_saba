'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { getCanonicalDefaultLimit, getCommercialPlanName, normalizeCanonicalPlanCode } from '@/lib/billing/plans-service';

export type AdvertiserFeature = 'benefits' | 'events' | 'posts' | 'video';

export interface AdvertiserFeatures {
  businessId: string;
  planCode: 'esquadro' | 'compasso' | 'acacia';
  planName: string;
  limits: { photos: number; services: number; benefits: number; events: number; posts: number; videos: number };
  /** Recursos liberados pelo plano (limite maior que zero). O menu e as páginas se baseiam nisto. */
  allows: Record<AdvertiserFeature, boolean>;
}

const FEATURE_CODES = {
  photos: 'gallery_photos_limit',
  services: 'services_limit',
  benefits: 'benefits_limit',
  events: 'events_limit',
  posts: 'posts_limit',
  videos: 'business_video_limit',
} as const;

/**
 * Plano e limites da empresa do usuário logado. Fonte: plano efetivo da assinatura (quando disponível) e
 * plan_entitlements do tenant (/admin/planos); sem linha na tabela, usa os limites canônicos do plano.
 */
export async function getAdvertiserFeaturesAction(): Promise<AdvertiserFeatures | null> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return null;
    const business = await findAdvertiserBusiness(supabase, userRes.user.id);
    if (!business) return null;

    // Plano efetivo (assinatura ativa); se a função não estiver acessível, usa o plano gravado na empresa.
    let planRaw: string | null = business.plan_code || business.plan_tier || null;
    try {
      const { data: effective } = await (supabase as any).rpc('_effective_business_plan', {
        p_tenant_id: business.tenant_id,
        p_business_id: business.id,
      });
      const row = Array.isArray(effective) ? effective[0] : effective;
      if (row?.plan_code) planRaw = row.plan_code;
    } catch {
      // mantém o plano da empresa
    }

    const planCode = normalizeCanonicalPlanCode(planRaw);
    const { data: rows } = await (supabase as any)
      .from('plan_entitlements')
      .select('feature_code, max_limit')
      .eq('tenant_id', business.tenant_id)
      .eq('plan_code', planRaw || 'bronze');
    const table: Record<string, number> = {};
    (rows || []).forEach((r: any) => {
      if (typeof r.max_limit === 'number') table[r.feature_code] = r.max_limit;
    });

    const limit = (key: keyof typeof FEATURE_CODES) => table[FEATURE_CODES[key]] ?? getCanonicalDefaultLimit(planRaw || 'bronze', FEATURE_CODES[key]);
    const limits = {
      photos: limit('photos'),
      services: limit('services'),
      benefits: limit('benefits'),
      events: limit('events'),
      posts: limit('posts'),
      videos: limit('videos'),
    };

    return {
      businessId: business.id,
      planCode,
      planName: getCommercialPlanName(planCode),
      limits,
      allows: { benefits: limits.benefits > 0, events: limits.events > 0, posts: limits.posts > 0, video: limits.videos > 0 },
    };
  } catch (err) {
    console.error('[getAdvertiserFeaturesAction]', err);
    return null;
  }
}

/**
 * Cota de criação no servidor: devolve uma mensagem de erro quando o plano não inclui o recurso ou o limite foi atingido,
 * ou null quando pode criar. A interface esconde o que o plano não inclui, mas a regra vale aqui também.
 */
export async function checkAdvertiserQuotaAction(
  kind: 'services' | 'benefits' | 'events' | 'posts',
  currentCount: number
): Promise<string | null> {
  const features = await getAdvertiserFeaturesAction();
  if (!features) return 'Empresa do anunciante não localizada.';
  const limit = features.limits[kind];
  const label = { services: 'serviços', benefits: 'benefícios', events: 'eventos', posts: 'publicações' }[kind];
  if (limit <= 0) return `O plano ${features.planName} não inclui ${label}. Conheça os planos em Meu Plano.`;
  if (currentCount >= limit) return `Você atingiu o limite de ${limit} ${label} do plano ${features.planName}.`;
  return null;
}
