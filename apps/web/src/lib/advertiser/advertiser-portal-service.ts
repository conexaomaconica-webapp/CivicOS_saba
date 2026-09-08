'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { resolveBusinessMedia, resolveLogoUrl, resolveCoverUrl } from '@/lib/business/business-media-helpers';

export interface AdvertiserDashboardDTO {
  business: {
    id: string;
    name: string;
    slug: string;
    publication_status_label: string;
    is_published: boolean;
    payment_status_label: string;
    is_payment_up_to_date: boolean;
    plan_code: string;
    plan_name: string;
    expiration_date: string;
    completeness_percent: number;
    missing_fields: string[];
    logo_url?: string;
    cover_url?: string;
  };
  results30d: {
    views: number;
    interactions: number;
    whatsapp_clicks: number;
    route_clicks: number;
    website_clicks: number;
    growth_percent: number;
  };
  quotas: {
    photos_used: number;
    photos_limit: number;
    services_used: number;
    services_limit: number;
    benefits_used: number;
    benefits_limit: number;
    events_used: number;
    events_limit: number;
  };
  attention_alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'critical';
    title: string;
    description: string;
    action_label?: string;
    action_url?: string;
  }>;
}

export async function getAdvertiserDashboardDTOAction(_userId?: string): Promise<AdvertiserDashboardDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let businessData: any = null;

    if (userRes?.user) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
      businessData = biz;
    }

    if (!businessData) {
      const { data: fallbackBiz } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .maybeSingle();
      businessData = fallbackBiz;
    }

    const b = businessData;

    // Resolver mídia via helper centralizado
    const media = await resolveBusinessMedia(supabase, b?.id || '', { logoUrl: b?.logo_url });

    // Resolver cotas via plan_entitlements (fonte canônica)
    const activePlanCode = b?.plan_code || b?.plan_tier || 'bronze';
    const { data: dashEntRows } = await (supabase as any)
      .from('plan_entitlements')
      .select('feature_code, max_limit')
      .eq('tenant_id', b?.tenant_id)
      .eq('plan_code', activePlanCode);
    const dashEntMap: Record<string, number> = {};
    (dashEntRows || []).forEach((e: any) => { dashEntMap[e.feature_code] = e.max_limit; });

    // Contagem real de registros ativos
    const bizId = b?.id || '';
    const { count: photosCount } = await (supabase as any)
      .from('business_media')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', bizId);
    const { count: servicesCount } = await (supabase as any)
      .from('business_services')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', bizId)
      .eq('is_active', true);
    const { count: benefitsCount } = await (supabase as any)
      .from('business_benefits')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', bizId)
      .is('archived_at', null)
      .in('status', ['scheduled', 'active', 'paused', 'exhausted']);
    const { count: eventsCount } = await (supabase as any)
      .from('business_events')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', bizId)
      .eq('is_active', true);

    const dto: AdvertiserDashboardDTO = {
      business: {
        id: b?.id || '',
        name: b?.name || '',
        slug: b?.slug || '',
        publication_status_label: b?.publication_status === 'published' ? 'Anúncio publicado' : 'Aguardando análise',
        is_published: b?.publication_status === 'published',
        payment_status_label: 'Pagamento em dia',
        is_payment_up_to_date: true,
        plan_code: b?.plan_code || b?.plan_tier || '',
        plan_name: '',
        expiration_date: '',
        completeness_percent: 86,
        missing_fields: [],
        logo_url: resolveLogoUrl(media.logo_url),
        cover_url: resolveCoverUrl(media.cover_url),
      },
      results30d: {
        views: 1284,
        interactions: 137,
        whatsapp_clicks: 86,
        route_clicks: 24,
        website_clicks: 18,
        growth_percent: 18,
      },
      quotas: {
        photos_used: photosCount || 0,
        photos_limit: dashEntMap['gallery_photos_limit'] ?? 0,
        services_used: servicesCount || 0,
        services_limit: dashEntMap['services_limit'] ?? 0,
        benefits_used: benefitsCount || 0,
        benefits_limit: dashEntMap['benefits_limit'] ?? 0,
        events_used: eventsCount || 0,
        events_limit: dashEntMap['events_limit'] ?? 0,
      },
      attention_alerts: [
        {
          id: 'alt-1',
          type: 'info',
          title: 'Imagem de capa ainda não cadastrada',
          description: 'Adicione uma foto de capa para aumentar em 25% a taxa de atração de clientes.',
          action_label: 'Adicionar Capa',
          action_url: '/anunciante/empresa/midias',
        },
        {
          id: 'alt-2',
          type: 'warning',
          title: '70% da cota de fotos da galeria utilizada',
          description: 'Você atingiu 70% da cota de fotos da galeria permitida pelo seu plano comercial.',
          action_label: 'Gerenciar Fotos',
          action_url: '/anunciante/empresa/midias',
        },
        {
          id: 'alt-3',
          type: 'info',
          title: 'Próxima renovação da assinatura: 24/08/2027',
          description: 'Sua assinatura anual está ativa e vinculada ao pagamento Asaas.',
          action_label: 'Ver Faturas',
          action_url: '/anunciante/financeiro',
        },
      ],
    };

    return dto;
  } catch (err: any) {
    console.error('Erro ao carregar dashboard do anunciante:', err);
    return {
      business: {
        id: '',
        name: '',
        slug: '',
        publication_status_label: '',
        is_published: false,
        payment_status_label: '',
        is_payment_up_to_date: false,
        plan_code: '',
        plan_name: '',
        expiration_date: '',
        completeness_percent: 0,
        missing_fields: [],
        logo_url: '/logoconexao_red_vert.png',
        cover_url: '/capa-padrao.jpg',
      },
      results30d: {
        views: 0,
        interactions: 0,
        whatsapp_clicks: 0,
        route_clicks: 0,
        website_clicks: 0,
        growth_percent: 0,
      },
      quotas: {
        photos_used: 0,
        photos_limit: 0,
        services_used: 0,
        services_limit: 0,
        benefits_used: 0,
        benefits_limit: 0,
        events_used: 0,
        events_limit: 0,
      },
      attention_alerts: [],
    };
  }
}
