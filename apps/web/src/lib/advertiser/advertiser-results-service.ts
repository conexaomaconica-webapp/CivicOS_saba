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
import {
  StreamingAnalyticsAggregator,
  type StreamAggregationResult,
} from '@/lib/analytics/analytics-aggregation';
import {
  type AcquisitionSource,
  type DiscoverySource,
} from '@/lib/analytics/traffic-sources';

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
  acquisitionSources?: Array<{
    source: AcquisitionSource;
    label: string;
    count: number;
    percentage: number;
  }>;
  discoverySources?: Array<{
    source: DiscoverySource;
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
  dataCompleteness?: {
    isComplete: boolean;
    isSampled: boolean;
    isTruncated: boolean;
    totalProcessedEvents: number;
    isLegacyDataPresent?: boolean;
    hasAcquisitionCoverage?: boolean;
    hasDiscoveryCoverage?: boolean;
    totalRecordsAnalyzed?: number;
  };
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

/**
 * Executa a agregação de métricas de forma escalável.
 * 1. Tenta a RPC agregadora no PostgreSQL (get_business_analytics_aggregate_metrics - Migration 215).
 * 2. Fallback: streaming iterativo em chunks de 1.000 eventos sem corte em 10.000 registros e sem estourar memória.
 */
async function loadAggregatedBusinessAnalytics(
  supabase: any,
  businessId: string,
  periodDays: number,
  nowMs: number,
  timezone: string
): Promise<StreamAggregationResult> {
  // 1. Tenta a RPC no PostgreSQL se disponível
  try {
    const { data, error } = await supabase.rpc('get_business_analytics_aggregate_metrics', {
      p_business_id: businessId,
      p_days: periodDays,
    });
    if (!error && data && data.kpis && Array.isArray(data.dailyEvolution)) {
      return data as StreamAggregationResult;
    }
  } catch {
    // Prossegue para o streaming em fallback
  }

  // 2. Fallback Streaming por Chunks (sem limite de 10.000)
  const doublePeriodStartIso = new Date(nowMs - 2 * periodDays * 86_400_000).toISOString();
  const aggregator = new StreamingAnalyticsAggregator(periodDays, nowMs, timezone);
  const pageSize = 1000;
  const maxSafeCeiling = 250000; // Teto de proteção de memória em fallback (250 mil)
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name, pseudonymous_subject_id, source, metadata, created_at')
      .eq('business_id', businessId)
      .gte('created_at', doublePeriodStartIso)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data || data.length === 0) {
      break;
    }

    aggregator.processChunk(data);

    if (data.length < pageSize) {
      hasMore = false;
    } else if (aggregator.totalProcessedEvents >= maxSafeCeiling) {
      aggregator.isTruncated = true;
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return aggregator.finalize();
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

    // Agregação escalável (PostgreSQL RPC ou Streaming Chunk Aggregator)
    const agg = await loadAggregatedBusinessAnalytics(supabase, businessId, periodDays, now, timezone);

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
    if (agg.kpis.whatsappClicks > 0) {
      recommendations.push({
        id: 'rec-wa',
        title: 'WhatsApp é o seu canal de maior tração',
        description: `${agg.kpis.whatsappClicks} pessoas iniciaram conversa direta neste período. Mantenha as notificações ativas e equipe alinhada para resposta rápida.`,
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
    if (agg.kpis.views === 0) {
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
      kpis: agg.kpis,
      funnel: agg.funnel,
      dailyEvolution: agg.dailyEvolution,
      trafficOrigins: agg.trafficOrigins,
      acquisitionSources: agg.acquisitionSources,
      discoverySources: agg.discoverySources,
      actionRanking: agg.actionRanking,
      topContent: {},
      geographicAggregation: agg.geographicAggregation,
      recommendations,
      profileDiagnosis,
      connectionResults,
      valueSummary,
      dataCompleteness: agg.dataCompleteness,
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
      acquisitionSources: [],
      discoverySources: [],
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
