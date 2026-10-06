'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { resolveBusinessMedia, resolveLogoUrl, resolveCoverUrl } from '@/lib/business/business-media-helpers';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { getCommercialPlanName } from '@/lib/billing/plans-service';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';

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
      // Dono da empresa ou membro da equipe (co-dono, gestor...).
      businessData = await findAdvertiserBusiness(supabase, userRes.user.id);
    }

    if (!userRes?.user || !businessData) throw new Error('Empresa do anunciante não localizada.');

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
    // Limites do plano efetivo (mesma fonte do menu): plan_entitlements e, sem linha, o padrão do plano.
    const planFeatures = await getAdvertiserFeaturesAction();
    const limitOf = (feature: string, fallback: number) => dashEntMap[feature] ?? fallback;

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

    const [{ data: locationRows }, { count: pendingConnections }] = await Promise.all([
      (supabase as any).from('business_locations').select('latitude, longitude').eq('business_id', bizId),
      (supabase as any).from('business_connections').select('id', { count: 'exact', head: true }).eq('business_id', bizId).eq('status', 'pendente'),
    ]);
    const hasMapLocation = (locationRows || []).some((l: any) => l.latitude != null && l.longitude != null);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const [{ data: analyticsRows }, { data: subscription }] = await Promise.all([
      (supabase as any).from('analytics_events').select('event_name, created_at')
        .eq('business_id', bizId).gte('created_at', sixtyDaysAgo.toISOString()),
      (supabase as any).from('subscriptions').select('status, current_period_end')
        .eq('business_id', bizId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const events30d = (analyticsRows || []).filter((event: any) => new Date(event.created_at) >= thirtyDaysAgo);
    const previousViews = (analyticsRows || []).filter((event: any) => new Date(event.created_at) < thirtyDaysAgo && ['view', 'page_view'].includes(event.event_name)).length;
    const views = events30d.filter((event: any) => ['view', 'page_view'].includes(event.event_name)).length;
    const whatsappClicks = events30d.filter((event: any) => event.event_name === 'whatsapp_click').length;
    const routeClicks = events30d.filter((event: any) => ['route_click', 'directions_click'].includes(event.event_name)).length;
    const websiteClicks = events30d.filter((event: any) => event.event_name === 'website_click').length;
    const interactions = events30d.filter((event: any) => ['whatsapp_click', 'phone_click', 'website_click', 'route_click', 'directions_click', 'benefit_click', 'social_click'].includes(event.event_name)).length;
    const growthPercent = previousViews > 0 ? Math.round(((views - previousViews) / previousViews) * 100) : 0;
    const isPaymentUpToDate = subscription?.status === 'active';

    // Completude real do anúncio (cada item vale o mesmo peso) e as pendências que o anunciante pode resolver.
    const completenessChecks: Array<{ ok: boolean; label: string }> = [
      { ok: Boolean(media.logo_url), label: 'Logomarca da empresa' },
      { ok: Boolean(media.cover_url), label: 'Imagem de capa' },
      { ok: String(b?.description ?? '').trim().length >= 60, label: 'Descrição da empresa (pelo menos 60 caracteres)' },
      { ok: Boolean(b?.phone || b?.whatsapp), label: 'Telefone ou WhatsApp de contato' },
      { ok: Boolean(b?.business_hours), label: 'Horário de funcionamento' },
      { ok: hasMapLocation, label: 'Endereço com localização no mapa' },
      { ok: (servicesCount || 0) > 0, label: 'Pelo menos um serviço cadastrado' },
      { ok: (photosCount || 0) > 1, label: 'Fotos na galeria' },
    ];
    const completenessPercent = Math.round((completenessChecks.filter((c) => c.ok).length / completenessChecks.length) * 100);
    const missingFields = completenessChecks.filter((c) => !c.ok).map((c) => c.label);

    const photosLimit = planFeatures?.limits.photos ?? limitOf('gallery_photos_limit', 0);
    const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
    const daysToRenew = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000) : null;
    const alerts: AdvertiserDashboardDTO['attention_alerts'] = [];
    if ((pendingConnections || 0) > 0) {
      alerts.push({
        id: 'pending-connections',
        type: 'warning',
        title: `${pendingConnections} ${pendingConnections === 1 ? 'conexão aguarda' : 'conexões aguardam'} a sua confirmação`,
        description: 'Confirmar o atendimento mostra o resultado da rede para a sua empresa e libera o registro no Mural.',
        action_label: 'Responder agora',
        action_url: '/anunciante/conexoes',
      });
    }
    if (!isPaymentUpToDate) {
      alerts.push({
        id: 'payment-pending',
        type: 'critical',
        title: 'Pagamento pendente',
        description: 'Regularize a assinatura para manter o anúncio ativo no Guia.',
        action_label: 'Ver faturas',
        action_url: '/anunciante/pagamentos',
      });
    }
    if (!media.cover_url) {
      alerts.push({
        id: 'cover-missing',
        type: 'info',
        title: 'Imagem de capa ainda não cadastrada',
        description: 'Uma capa aumenta a atração de clientes na página da empresa.',
        action_label: 'Adicionar capa',
        action_url: '/anunciante/empresa/midias',
      });
    }
    if (photosLimit > 0 && (photosCount || 0) / photosLimit >= 0.8) {
      alerts.push({
        id: 'photos-quota',
        type: 'warning',
        title: `Cota de fotos quase esgotada (${photosCount} de ${photosLimit})`,
        description: 'Para publicar mais fotos, remova alguma ou conheça um plano superior.',
        action_label: 'Gerenciar fotos',
        action_url: '/anunciante/empresa/midias',
      });
    }
    if (daysToRenew !== null && daysToRenew >= 0 && daysToRenew <= 30) {
      alerts.push({
        id: 'renewal-near',
        type: 'info',
        title: `Renovação em ${daysToRenew} ${daysToRenew === 1 ? 'dia' : 'dias'}`,
        description: `A assinatura vigora até ${periodEnd!.toLocaleDateString('pt-BR')}.`,
        action_label: 'Ver plano',
        action_url: '/anunciante/plano',
      });
    }

    const dto: AdvertiserDashboardDTO = {
      business: {
        id: b?.id || '',
        name: b?.name || '',
        slug: b?.slug || '',
        publication_status_label: b?.publication_status === 'published' ? 'Anúncio publicado' : 'Aguardando análise',
        is_published: b?.publication_status === 'published',
        payment_status_label: isPaymentUpToDate ? 'Pagamento em dia' : 'Pagamento pendente',
        is_payment_up_to_date: isPaymentUpToDate,
        plan_code: b?.plan_code || b?.plan_tier || '',
        plan_name: getCommercialPlanName(activePlanCode),
        expiration_date: periodEnd ? periodEnd.toLocaleDateString('pt-BR') : '',
        completeness_percent: completenessPercent,
        missing_fields: missingFields,
        logo_url: resolveLogoUrl(media.logo_url),
        cover_url: resolveCoverUrl(media.cover_url),
      },
      results30d: {
        views,
        interactions,
        whatsapp_clicks: whatsappClicks,
        route_clicks: routeClicks,
        website_clicks: websiteClicks,
        growth_percent: growthPercent,
      },
      quotas: {
        photos_used: photosCount || 0,
        photos_limit: planFeatures?.limits.photos ?? limitOf('gallery_photos_limit', 0),
        services_used: servicesCount || 0,
        services_limit: planFeatures?.limits.services ?? limitOf('services_limit', 0),
        benefits_used: benefitsCount || 0,
        benefits_limit: planFeatures?.limits.benefits ?? limitOf('benefits_limit', 0),
        events_used: eventsCount || 0,
        events_limit: planFeatures?.limits.events ?? limitOf('events_limit', 0),
      },
      attention_alerts: alerts,
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
