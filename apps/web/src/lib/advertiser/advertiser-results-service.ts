'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import {
  buildMilestones,
  buildMonthlySummary,
  nextConnectionMilestone,
  type Milestone,
  type ValueSummaryRaw,
} from '@/lib/advertiser/value-summary';

export type TimePeriod = '7d' | '30d' | '90d';

export interface AdvertiserResultsDTO {
  period: TimePeriod;
  periodLabel: string;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  kpis: {
    views: number;
    viewsComparisonPercent: number;
    uniqueVisitors: number;
    uniqueVisitorsComparisonPercent: number;
    interactions: number;
    interactionsComparisonPercent: number;
    whatsappClicks: number;
    whatsappComparisonPercent: number;
    phoneClicks: number;
    phoneComparisonPercent: number;
    websiteClicks: number;
    websiteComparisonPercent: number;
    instagramClicks: number;
    instagramComparisonPercent: number;
    routeClicks: number;
    routeComparisonPercent: number;
    shares: number;
    sharesComparisonPercent: number;
    interactionRatePercent: number;
  };
  funnel: {
    views: number;
    interactions: number;
    whatsapp: number;
    routes: number;
  };
  dailyEvolution: Array<{
    date: string;
    views: number;
    uniqueVisitors: number;
    interactions: number;
  }>;
  trafficOrigins: Array<{
    origin: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  actionRanking: Array<{
    action: string;
    label: string;
    count: number;
    iconType: string;
  }>;
  topContent: {
    topService?: { title: string; views: number };
    topBenefit?: { title: string; clicks: number };
    topEvent?: { title: string; views: number };
  };
  geographicAggregation: Array<{
    city: string;
    state: string;
    percentage: number;
    visitorsCount: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning';
  }>;
  profileDiagnosis: {
    score: number;
    completedCount: number;
    totalCount: number;
    missingItems: Array<{ field: string; label: string; actionUrl: string }>;
  };
  /** Resultado do período (conexões registradas pela rede). Null quando indisponível. */
  connectionResults: ConnectionResultsDTO | null;
  /** Resumo do mês e marcos alcançados. Null quando indisponível. */
  valueSummary: ValueSummaryDTO | null;
  lastUpdatedAt: string;
  timezone: string;
}

export interface ValueSummaryDTO {
  headline: string;
  lines: string[];
  opportunity: string | null;
  milestones: Milestone[];
  nextConnectionMilestone: { target: number; remaining: number } | null;
}

async function loadValueSummary(supabase: any, businessId: string): Promise<ValueSummaryDTO | null> {
  try {
    const { data, error } = await supabase.rpc('business_value_summary', { p_business_id: businessId });
    if (error || !data) return null;
    const raw = data as ValueSummaryRaw;
    const summary = buildMonthlySummary(raw);
    return {
      ...summary,
      milestones: buildMilestones(raw.lifetime, raw.months_on_platform),
      nextConnectionMilestone: nextConnectionMilestone(raw.lifetime),
    };
  } catch {
    return null;
  }
}

export interface ConnectionResultsDTO {
  registered: number;
  commercial: number;
  visits: number;
  confirmedCommercial: number;
  pending: number;
  withValue: number;
  byValueRange: Record<string, number>;
  byOrigin: Record<string, number>;
  searchImpressions: number;
  shares: number;
  referrals: number;
  benefitClaims: number;
}

async function loadConnectionResults(supabase: any, businessId: string, days: number): Promise<ConnectionResultsDTO | null> {
  try {
    const { data, error } = await supabase.rpc('business_results_summary', { p_business_id: businessId, p_days: days });
    if (error || !data) return null;
    const c = data.connections ?? {};
    const e = data.events ?? {};
    return {
      registered: Number(c.registered ?? 0),
      commercial: Number(c.commercial ?? 0),
      visits: Number(c.visits ?? 0),
      confirmedCommercial: Number(c.confirmed_commercial ?? 0),
      pending: Number(c.pending ?? 0),
      withValue: Number(c.with_value ?? 0),
      byValueRange: c.by_value_range ?? {},
      byOrigin: c.by_origin ?? {},
      searchImpressions: Number(e.search_impression ?? 0),
      shares: Number(e.share ?? 0),
      referrals: Number(e.referral ?? 0),
      benefitClaims: Number(e.benefit_claim ?? 0),
    };
  } catch {
    return null;
  }
}

function calcGrowth(current: number, prev: number): number {
  if (prev <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - prev) / prev) * 100);
}

/**
 * Consulta eventos do banco de dados paginados usando o índice (business_id, created_at)
 * para evitar limites de truncamento e assegurar contagem exata até 10.000 registros.
 */
async function fetchBusinessAnalyticsEvents(
  supabase: any,
  businessId: string,
  sinceIso: string,
  maxRecords = 10000
) {
  const pageSize = 1000;
  const allEvents: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore && allEvents.length < maxRecords) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name, pseudonymous_subject_id, source, metadata, created_at')
      .eq('business_id', businessId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data || data.length === 0) {
      break;
    }
    allEvents.push(...data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allEvents;
}

export async function getAdvertiserResultsDTOAction(
  period: TimePeriod = '30d'
): Promise<AdvertiserResultsDTO> {
  const periodLabel = period === '7d' ? 'Últimos 7 dias' : period === '90d' ? 'Últimos 90 dias' : 'Últimos 30 dias';
  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const now = Date.now();
  const lastUpdatedAt = new Date(now).toISOString();
  const timezone = 'America/Sao_Paulo';

  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    let b: any = null;
    if (userRes?.user) {
      const userBiz = await findAdvertiserBusiness(supabase, userRes.user.id);
      b = userBiz;
    }

    if (!userRes?.user || !b) {
      throw new Error('Empresa do anunciante não localizada.');
    }

    const businessId = b.id;

    // Registra marcos novos sem bloquear o painel
    try {
      await supabase.rpc('sync_business_milestones' as any, { p_business_id: businessId } as any);
    } catch {
      // Marcos nunca bloqueiam o painel.
    }

    const [connectionResults, valueSummary] = await Promise.all([
      loadConnectionResults(supabase, businessId, periodDays),
      loadValueSummary(supabase, businessId),
    ]);

    // Busca eventos dos dois períodos (atual e anterior) em uma única consulta paginada
    const periodStartMs = now - periodDays * 86_400_000;
    const doublePeriodStartMs = now - 2 * periodDays * 86_400_000;
    const doublePeriodStartIso = new Date(doublePeriodStartMs).toISOString();

    let rawEvents: any[] = [];
    try {
      rawEvents = await fetchBusinessAnalyticsEvents(supabase, businessId, doublePeriodStartIso);
    } catch {
      rawEvents = [];
    }

    const currentEvents = rawEvents.filter((e) => new Date(e.created_at).getTime() >= periodStartMs);
    const prevEvents = rawEvents.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t < periodStartMs && t >= doublePeriodStartMs;
    });

    const isView = (e: any) => e.event_name === 'view' || e.event_name === 'page_view';
    const isWhatsapp = (e: any) => e.event_name === 'whatsapp_click';
    const isRoute = (e: any) => e.event_name === 'route_click' || e.event_name === 'directions_click';
    const isWebsite = (e: any) => e.event_name === 'website_click';
    const isPhone = (e: any) => e.event_name === 'phone_click';
    const isInstagram = (e: any) => e.event_name === 'instagram_click' || (e.event_name === 'social_click' && e.metadata?.channel === 'instagram');
    const isShare = (e: any) => e.event_name === 'share';

    // 1. Contagens do Período Atual
    const views = currentEvents.filter(isView).length;
    const prevViews = prevEvents.filter(isView).length;

    const currentVisitorSet = new Set<string>();
    currentEvents.filter(isView).forEach((e) => {
      if (e.pseudonymous_subject_id) currentVisitorSet.add(e.pseudonymous_subject_id);
    });
    const uniqueVisitors = currentVisitorSet.size || (views > 0 ? 1 : 0);

    const prevVisitorSet = new Set<string>();
    prevEvents.filter(isView).forEach((e) => {
      if (e.pseudonymous_subject_id) prevVisitorSet.add(e.pseudonymous_subject_id);
    });
    const prevUniqueVisitors = prevVisitorSet.size || (prevViews > 0 ? 1 : 0);

    const whatsappClicks = currentEvents.filter(isWhatsapp).length;
    const prevWhatsappClicks = prevEvents.filter(isWhatsapp).length;

    const routeClicks = currentEvents.filter(isRoute).length;
    const prevRouteClicks = prevEvents.filter(isRoute).length;

    const websiteClicks = currentEvents.filter(isWebsite).length;
    const prevWebsiteClicks = prevEvents.filter(isWebsite).length;

    const phoneClicks = currentEvents.filter(isPhone).length;
    const prevPhoneClicks = prevEvents.filter(isPhone).length;

    const instagramClicks = currentEvents.filter(isInstagram).length;
    const prevInstagramClicks = prevEvents.filter(isInstagram).length;

    const shares = currentEvents.filter(isShare).length;
    const prevShares = prevEvents.filter(isShare).length;

    const interactions = whatsappClicks + routeClicks + websiteClicks + phoneClicks + instagramClicks + shares;
    const prevInteractions = prevWhatsappClicks + prevRouteClicks + prevWebsiteClicks + prevPhoneClicks + prevInstagramClicks + prevShares;

    const interactionRatePercent = views > 0 ? Number(((interactions / views) * 100).toFixed(1)) : 0;

    // 2. Evolução Diária Real com Datas Reais
    const dailyMap = new Map<string, { date: string; views: number; uniqueVisitors: Set<string>; interactions: number }>();
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 86_400_000);
      const key = d.toLocaleDateString('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit' });
      dailyMap.set(key, { date: key, views: 0, uniqueVisitors: new Set<string>(), interactions: 0 });
    }

    for (const e of currentEvents) {
      const eventDate = new Date(e.created_at).toLocaleDateString('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit' });
      const entry = dailyMap.get(eventDate);
      if (entry) {
        if (isView(e)) {
          entry.views++;
          if (e.pseudonymous_subject_id) entry.uniqueVisitors.add(e.pseudonymous_subject_id);
        } else {
          entry.interactions++;
        }
      }
    }

    const dailyEvolution = Array.from(dailyMap.values()).map((d) => ({
      date: d.date,
      views: d.views,
      uniqueVisitors: d.uniqueVisitors.size || (d.views > 0 ? 1 : 0),
      interactions: d.interactions,
    }));

    // 3. Origens dos Acessos
    const originCounts = {
      guia: 0,
      redes: 0,
      buscadores: 0,
      mural: 0,
      direto: 0,
    };

    currentEvents.filter(isView).forEach((e) => {
      const o = String(e.metadata?.origin || e.source || '').toLowerCase();
      if (o.includes('search') || o.includes('directory') || o.includes('categoria') || o.includes('lista') || o.includes('destaque')) {
        originCounts.guia++;
      } else if (o.includes('social') || o.includes('share') || o.includes('whatsapp') || o.includes('qr') || o.includes('instagram')) {
        originCounts.redes++;
      } else if (o.includes('google') || o.includes('organic') || o.includes('bing') || o.includes('ai_search')) {
        originCounts.buscadores++;
      } else if (o.includes('mural') || o.includes('connection') || o.includes('referral')) {
        originCounts.mural++;
      } else {
        originCounts.direto++;
      }
    });

    const totalViewsForOrigin = views > 0 ? views : 1;
    const trafficOrigins = [
      { origin: 'guia', label: 'Busca e Navegação no Guia', count: originCounts.guia, percentage: views > 0 ? Math.round((originCounts.guia / totalViewsForOrigin) * 100) : 0 },
      { origin: 'redes', label: 'Links Compartilhados e Redes', count: originCounts.redes, percentage: views > 0 ? Math.round((originCounts.redes / totalViewsForOrigin) * 100) : 0 },
      { origin: 'buscadores', label: 'Google e Motores de Busca', count: originCounts.buscadores, percentage: views > 0 ? Math.round((originCounts.buscadores / totalViewsForOrigin) * 100) : 0 },
      { origin: 'mural', label: 'Mural de Conexões e Indicações', count: originCounts.mural, percentage: views > 0 ? Math.round((originCounts.mural / totalViewsForOrigin) * 100) : 0 },
      { origin: 'direto', label: 'Acessos Diretos / Outros', count: originCounts.direto, percentage: views > 0 ? Math.round((originCounts.direto / totalViewsForOrigin) * 100) : 0 },
    ];

    // 4. Ranking de Ações
    const actionRanking = [
      { action: 'whatsapp', label: 'Cliques no WhatsApp Direct', count: whatsappClicks, iconType: 'whatsapp' },
      { action: 'routes', label: 'Solicitações de Rota GPS', count: routeClicks, iconType: 'map-pin' },
      { action: 'website', label: 'Acessos ao Website Oficial', count: websiteClicks, iconType: 'globe' },
      { action: 'phone', label: 'Chamadas Telefônicas', count: phoneClicks, iconType: 'phone' },
      { action: 'instagram', label: 'Visitas ao Instagram', count: instagramClicks, iconType: 'instagram' },
      { action: 'share', label: 'Compartilhamentos do Anúncio', count: shares, iconType: 'share-2' },
    ].sort((a, b) => b.count - a.count);

    // 5. Agregação Geográfica Real
    const geoMap = new Map<string, { city: string; state: string; count: number }>();
    currentEvents.forEach((e) => {
      const city = e.metadata?.city;
      const state = e.metadata?.state;
      if (city && state) {
        const key = `${city}-${state}`;
        const curr = geoMap.get(key) || { city, state, count: 0 };
        curr.count++;
        geoMap.set(key, curr);
      }
    });

    const totalGeo = Array.from(geoMap.values()).reduce((acc, curr) => acc + curr.count, 0);
    const geographicAggregation = Array.from(geoMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((g) => ({
        city: g.city,
        state: g.state,
        visitorsCount: g.count,
        percentage: totalGeo > 0 ? Math.round((g.count / totalGeo) * 100) : 0,
      }));

    // 6. Diagnóstico de Preenchimento do Perfil
    const missingItems: Array<{ field: string; label: string; actionUrl: string }> = [];
    let completedWeight = 0;

    if (b.logo_url) completedWeight += 15;
    else missingItems.push({ field: 'logo', label: 'Logomarca da empresa', actionUrl: '/anunciante/empresa' });

    if (b.cover_url) completedWeight += 15;
    else missingItems.push({ field: 'cover', label: 'Foto de capa institucional', actionUrl: '/anunciante/empresa/midias' });

    if (b.description && b.description.length >= 40) completedWeight += 20;
    else missingItems.push({ field: 'description', label: 'Descrição detalhada dos serviços', actionUrl: '/anunciante/empresa' });

    if (b.whatsapp) completedWeight += 20;
    else missingItems.push({ field: 'whatsapp', label: 'WhatsApp com DDD ativo', actionUrl: '/anunciante/empresa' });

    if (b.address || b.city) completedWeight += 10;
    else missingItems.push({ field: 'address', label: 'Endereço e localização', actionUrl: '/anunciante/empresa' });

    if (b.opening_hours) completedWeight += 10;
    else missingItems.push({ field: 'hours', label: 'Horários de atendimento', actionUrl: '/anunciante/empresa' });

    if (b.website || b.instagram) completedWeight += 10;
    else missingItems.push({ field: 'online', label: 'Website ou perfil do Instagram', actionUrl: '/anunciante/empresa' });

    const profileDiagnosis = {
      score: completedWeight,
      completedCount: 7 - missingItems.length,
      totalCount: 7,
      missingItems,
    };

    // 7. Recomendações
    const recommendations: Array<{ id: string; title: string; description: string; type: 'success' | 'info' | 'warning' }> = [];
    if (whatsappClicks > 0) {
      recommendations.push({
        id: 'rec-wa',
        title: 'WhatsApp é o seu canal de maior tração',
        description: `${whatsappClicks} pessoas iniciaram conversa direta neste período. Mantenha as notificações ativas e equipe alinhada para resposta rápida.`,
        type: 'success',
      });
    }
    if (missingItems.length > 0) {
      recommendations.push({
        id: 'rec-diag',
        title: `Melhore seu anúncio (+${100 - completedWeight}% de completude)`,
        description: `Itens recomendados para aumentar contatos: ${missingItems.map((m) => m.label).slice(0, 3).join(', ')}.`,
        type: 'info',
      });
    }
    if (views === 0) {
      recommendations.push({
        id: 'rec-share',
        title: 'Divulgue seu anúncio no Guia',
        description: 'Compartilhe o link do seu perfil em grupos e redes para começar a receber visualizações e gerar contatos diretos.',
        type: 'info',
      });
    }

    return {
      period,
      periodLabel,
      business: {
        id: businessId,
        name: b.name,
        slug: b.slug,
      },
      kpis: {
        views,
        viewsComparisonPercent: calcGrowth(views, prevViews),
        uniqueVisitors,
        uniqueVisitorsComparisonPercent: calcGrowth(uniqueVisitors, prevUniqueVisitors),
        interactions,
        interactionsComparisonPercent: calcGrowth(interactions, prevInteractions),
        whatsappClicks,
        whatsappComparisonPercent: calcGrowth(whatsappClicks, prevWhatsappClicks),
        phoneClicks,
        phoneComparisonPercent: calcGrowth(phoneClicks, prevPhoneClicks),
        websiteClicks,
        websiteComparisonPercent: calcGrowth(websiteClicks, prevWebsiteClicks),
        instagramClicks,
        instagramComparisonPercent: calcGrowth(instagramClicks, prevInstagramClicks),
        routeClicks,
        routeComparisonPercent: calcGrowth(routeClicks, prevRouteClicks),
        shares,
        sharesComparisonPercent: calcGrowth(shares, prevShares),
        interactionRatePercent,
      },
      funnel: {
        views,
        interactions,
        whatsapp: whatsappClicks,
        routes: routeClicks,
      },
      dailyEvolution,
      trafficOrigins,
      actionRanking,
      topContent: {},
      geographicAggregation,
      recommendations,
      profileDiagnosis,
      connectionResults,
      valueSummary,
      lastUpdatedAt,
      timezone,
    };
  } catch (err: any) {
    // Retorna estado vazio autêntico sem inventar números nem exibir mocks de outras empresas
    return {
      period,
      periodLabel,
      business: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Sua Empresa',
        slug: 'sua-empresa',
      },
      kpis: {
        views: 0,
        viewsComparisonPercent: 0,
        uniqueVisitors: 0,
        uniqueVisitorsComparisonPercent: 0,
        interactions: 0,
        interactionsComparisonPercent: 0,
        whatsappClicks: 0,
        whatsappComparisonPercent: 0,
        phoneClicks: 0,
        phoneComparisonPercent: 0,
        websiteClicks: 0,
        websiteComparisonPercent: 0,
        instagramClicks: 0,
        instagramComparisonPercent: 0,
        routeClicks: 0,
        routeComparisonPercent: 0,
        shares: 0,
        sharesComparisonPercent: 0,
        interactionRatePercent: 0,
      },
      funnel: {
        views: 0,
        interactions: 0,
        whatsapp: 0,
        routes: 0,
      },
      dailyEvolution: [],
      trafficOrigins: [],
      actionRanking: [],
      topContent: {},
      geographicAggregation: [],
      recommendations: [
        {
          id: 'rec-empty',
          title: 'Divulgue seu Anúncio no Guia',
          description: 'Compartilhe seu link público com a Fraternidade para começar a receber acessos e gerar contatos diretos.',
          type: 'info',
        },
      ],
      profileDiagnosis: {
        score: 0,
        completedCount: 0,
        totalCount: 7,
        missingItems: [],
      },
      connectionResults: null,
      valueSummary: null,
      lastUpdatedAt,
      timezone,
    };
  }
}
