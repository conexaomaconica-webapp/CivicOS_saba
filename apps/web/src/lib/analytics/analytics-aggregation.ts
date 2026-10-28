import {
  type AcquisitionSource,
  type DiscoverySource,
  ACQUISITION_SOURCES,
  ACQUISITION_LABELS,
  DISCOVERY_SOURCES,
  DISCOVERY_LABELS,
  normalizeAcquisitionSource,
  normalizeDiscoverySource,
} from '@/lib/analytics/traffic-sources';

export interface RawAnalyticsEvent {
  event_name: string;
  pseudonymous_subject_id?: string | null;
  source?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface StreamAggregationResult {
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
  acquisitionSources: Array<{
    source: AcquisitionSource;
    label: string;
    count: number;
    percentage: number;
  }>;
  discoverySources: Array<{
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
  geographicAggregation: Array<{
    city: string;
    state: string;
    percentage: number;
    visitorsCount: number;
  }>;
  dataCompleteness: {
    isComplete: boolean;
    isSampled: boolean;
    isTruncated: boolean;
    totalProcessedEvents: number;
  };
}

export function calcGrowthPercent(current: number, prev: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

export const isViewEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'view' || e.event_name === 'page_view';

export const isWhatsappEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'whatsapp_click';

export const isRouteEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'route_click' || e.event_name === 'directions_click';

export const isWebsiteEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'website_click';

export const isPhoneEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'phone_click';

export const isInstagramEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'instagram_click' ||
  (e.event_name === 'social_click' && e.metadata?.channel === 'instagram');

export const isShareEvent = (e: RawAnalyticsEvent) =>
  e.event_name === 'share';

/**
 * Agregador streaming em memória de alta performance.
 * Não acumula objetos crus na memória; processa blocos iterativamente
 * mantendo apenas acumuladores escaláveis e contagens atômicas.
 */
export class StreamingAnalyticsAggregator {
  private nowMs: number;
  private periodStartMs: number;
  private doublePeriodStartMs: number;

  // Acumuladores Período Atual
  public currentViews = 0;
  public currentWhatsapp = 0;
  public currentRoute = 0;
  public currentWebsite = 0;
  public currentPhone = 0;
  public currentInstagram = 0;
  public currentShares = 0;
  public currentVisitorSet = new Set<string>();

  // Acumuladores Período Anterior
  public prevViews = 0;
  public prevWhatsapp = 0;
  public prevRoute = 0;
  public prevWebsite = 0;
  public prevPhone = 0;
  public prevInstagram = 0;
  public prevShares = 0;
  public prevVisitorSet = new Set<string>();

  // Mapas Diários e Geográficos
  private dailyMap = new Map<string, { date: string; views: number; uniqueVisitors: Set<string>; interactions: number }>();
  private geoMap = new Map<string, { city: string; state: string; count: number }>();
  private originCounts = {
    guia: 0,
    redes: 0,
    buscadores: 0,
    mural: 0,
    direto: 0,
    desconhecido: 0,
  };

  // Acumuladores de Rastreabilidade Independente (Etapa B)
  private acquisitionCounts: Record<AcquisitionSource, number> = {
    direct: 0,
    organic_search: 0,
    social: 0,
    campaign: 0,
    qr_code: 0,
    external_referral: 0,
    unidentified: 0,
  };

  private discoveryCounts: Record<DiscoverySource, number> = {
    text_search: 0,
    category: 0,
    map: 0,
    featured_sponsored: 0,
    feed_wall: 0,
    benefits_club: 0,
    lodges_guide: 0,
    direct_link: 0,
    unidentified: 0,
  };

  private dateFormatter: Intl.DateTimeFormat;
  public totalProcessedEvents = 0;
  public isTruncated = false;

  constructor(periodDays: number, nowMs = Date.now(), timezone = 'America/Sao_Paulo') {
    this.nowMs = nowMs;
    this.periodStartMs = nowMs - periodDays * 86_400_000;
    this.doublePeriodStartMs = nowMs - 2 * periodDays * 86_400_000;
    this.dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, day: '2-digit', month: '2-digit' });

    // Inicializa todos os dias do período no mapa com zero
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(nowMs - i * 86_400_000);
      const key = this.dateFormatter.format(d);
      this.dailyMap.set(key, { date: key, views: 0, uniqueVisitors: new Set<string>(), interactions: 0 });
    }
  }

  /**
   * Processa um bloco de eventos sem reter o array na memória.
   */
  public processChunk(events: RawAnalyticsEvent[]): void {
    for (const e of events) {
      this.totalProcessedEvents++;
      const eventTime = new Date(e.created_at).getTime();

      // Fora do escopo de 2 períodos
      if (eventTime < this.doublePeriodStartMs || eventTime > this.nowMs) {
        continue;
      }

      const isCurrent = eventTime >= this.periodStartMs;

      if (isCurrent) {
        // --- Período Atual ---
        if (isViewEvent(e)) {
          this.currentViews++;
          if (e.pseudonymous_subject_id) this.currentVisitorSet.add(e.pseudonymous_subject_id);

          // Rastreabilidade Independente (Etapa B)
          const rawAcq = e.metadata?.acquisition_source ?? e.metadata?.origin ?? (e.source === 'direct' ? 'direct' : null);
          const acq = normalizeAcquisitionSource(rawAcq);
          this.acquisitionCounts[acq] = (this.acquisitionCounts[acq] || 0) + 1;

          const rawDisc = e.metadata?.discovery_source ?? e.metadata?.source ?? e.source;
          const disc = normalizeDiscoverySource(rawDisc);
          this.discoveryCounts[disc] = (this.discoveryCounts[disc] || 0) + 1;

          // Origem da visita (retrocompatibilidade)
          const o = String(e.metadata?.origin || e.source || '').toLowerCase().trim();
          if (o.includes('search') || o.includes('directory') || o.includes('categoria') || o.includes('lista') || o.includes('destaque')) {
            this.originCounts.guia++;
          } else if (o.includes('social') || o.includes('share') || o.includes('whatsapp') || o.includes('qr') || o.includes('instagram')) {
            this.originCounts.redes++;
          } else if (o.includes('google') || o.includes('organic') || o.includes('bing') || o.includes('ai_search')) {
            this.originCounts.buscadores++;
          } else if (o.includes('mural') || o.includes('connection') || o.includes('referral')) {
            this.originCounts.mural++;
          } else if (o === 'direct') {
            this.originCounts.direto++;
          } else {
            this.originCounts.desconhecido++;
          }
        } else if (isWhatsappEvent(e)) {
          this.currentWhatsapp++;
        } else if (isRouteEvent(e)) {
          this.currentRoute++;
        } else if (isWebsiteEvent(e)) {
          this.currentWebsite++;
        } else if (isPhoneEvent(e)) {
          this.currentPhone++;
        } else if (isInstagramEvent(e)) {
          this.currentInstagram++;
        } else if (isShareEvent(e)) {
          this.currentShares++;
        }

        // Evolução Diária
        const eventDate = this.dateFormatter.format(new Date(eventTime));
        const dayEntry = this.dailyMap.get(eventDate);
        if (dayEntry) {
          if (isViewEvent(e)) {
            dayEntry.views++;
            if (e.pseudonymous_subject_id) dayEntry.uniqueVisitors.add(e.pseudonymous_subject_id);
          } else {
            dayEntry.interactions++;
          }
        }

        // Agregação Geográfica
        const city = e.metadata?.city;
        const state = e.metadata?.state;
        if (city && state) {
          const key = `${city}-${state}`;
          const curr = this.geoMap.get(key) || { city, state, count: 0 };
          curr.count++;
          this.geoMap.set(key, curr);
        }
      } else {
        // --- Período Anterior ---
        if (isViewEvent(e)) {
          this.prevViews++;
          if (e.pseudonymous_subject_id) this.prevVisitorSet.add(e.pseudonymous_subject_id);
        } else if (isWhatsappEvent(e)) {
          this.prevWhatsapp++;
        } else if (isRouteEvent(e)) {
          this.prevRoute++;
        } else if (isWebsiteEvent(e)) {
          this.prevWebsite++;
        } else if (isPhoneEvent(e)) {
          this.prevPhone++;
        } else if (isInstagramEvent(e)) {
          this.prevInstagram++;
        } else if (isShareEvent(e)) {
          this.prevShares++;
        }
      }
    }
  }

  /**
   * Finaliza e constrói o resultado DTO compilado com precisão matemática.
   */
  public finalize(): StreamAggregationResult {
    const uniqueVisitors = this.currentVisitorSet.size || (this.currentViews > 0 ? 1 : 0);
    const prevUniqueVisitors = this.prevVisitorSet.size || (this.prevViews > 0 ? 1 : 0);

    const interactions =
      this.currentWhatsapp +
      this.currentRoute +
      this.currentWebsite +
      this.currentPhone +
      this.currentInstagram +
      this.currentShares;

    const prevInteractions =
      this.prevWhatsapp +
      this.prevRoute +
      this.prevWebsite +
      this.prevPhone +
      this.prevInstagram +
      this.prevShares;

    const interactionRatePercent =
      this.currentViews > 0 ? Number(((interactions / this.currentViews) * 100).toFixed(1)) : 0;

    const dailyEvolution = Array.from(this.dailyMap.values()).map((d) => ({
      date: d.date,
      views: d.views,
      uniqueVisitors: d.uniqueVisitors.size || (d.views > 0 ? 1 : 0),
      interactions: d.interactions,
    }));

    const totalViewsForOrigin = this.currentViews > 0 ? this.currentViews : 1;
    const trafficOrigins = [
      { origin: 'guia', label: 'Busca e Navegação no Guia', count: this.originCounts.guia, percentage: this.currentViews > 0 ? Math.round((this.originCounts.guia / totalViewsForOrigin) * 100) : 0 },
      { origin: 'redes', label: 'Links Compartilhados e Redes', count: this.originCounts.redes, percentage: this.currentViews > 0 ? Math.round((this.originCounts.redes / totalViewsForOrigin) * 100) : 0 },
      { origin: 'buscadores', label: 'Google e Motores de Busca', count: this.originCounts.buscadores, percentage: this.currentViews > 0 ? Math.round((this.originCounts.buscadores / totalViewsForOrigin) * 100) : 0 },
      { origin: 'mural', label: 'Mural de Conexões e Indicações', count: this.originCounts.mural, percentage: this.currentViews > 0 ? Math.round((this.originCounts.mural / totalViewsForOrigin) * 100) : 0 },
      { origin: 'direto', label: 'Acessos Diretos (Confirmados)', count: this.originCounts.direto, percentage: this.currentViews > 0 ? Math.round((this.originCounts.direto / totalViewsForOrigin) * 100) : 0 },
      { origin: 'desconhecido', label: 'Origem Não Identificada / Outros', count: this.originCounts.desconhecido, percentage: this.currentViews > 0 ? Math.round((this.originCounts.desconhecido / totalViewsForOrigin) * 100) : 0 },
    ];

    const acquisitionSources = ACQUISITION_SOURCES.map((source) => ({
      source,
      label: ACQUISITION_LABELS[source],
      count: this.acquisitionCounts[source] || 0,
      percentage: this.currentViews > 0 ? Math.round(((this.acquisitionCounts[source] || 0) / totalViewsForOrigin) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const discoverySources = DISCOVERY_SOURCES.map((source) => ({
      source,
      label: DISCOVERY_LABELS[source],
      count: this.discoveryCounts[source] || 0,
      percentage: this.currentViews > 0 ? Math.round(((this.discoveryCounts[source] || 0) / totalViewsForOrigin) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const actionRanking = [
      { action: 'whatsapp', label: 'Cliques no WhatsApp Direct', count: this.currentWhatsapp, iconType: 'whatsapp' },
      { action: 'routes', label: 'Solicitações de Rota GPS', count: this.currentRoute, iconType: 'map-pin' },
      { action: 'website', label: 'Acessos ao Website Oficial', count: this.currentWebsite, iconType: 'globe' },
      { action: 'phone', label: 'Chamadas Telefônicas', count: this.currentPhone, iconType: 'phone' },
      { action: 'instagram', label: 'Visitas ao Instagram', count: this.currentInstagram, iconType: 'instagram' },
      { action: 'share', label: 'Compartilhamentos do Anúncio', count: this.currentShares, iconType: 'share-2' },
    ].sort((a, b) => b.count - a.count);

    const totalGeo = Array.from(this.geoMap.values()).reduce((acc, curr) => acc + curr.count, 0);
    const geographicAggregation = Array.from(this.geoMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((g) => ({
        city: g.city,
        state: g.state,
        visitorsCount: g.count,
        percentage: totalGeo > 0 ? Math.round((g.count / totalGeo) * 100) : 0,
      }));

    return {
      kpis: {
        views: this.currentViews,
        viewsComparisonPercent: calcGrowthPercent(this.currentViews, this.prevViews),
        uniqueVisitors,
        uniqueVisitorsComparisonPercent: calcGrowthPercent(uniqueVisitors, prevUniqueVisitors),
        interactions,
        interactionsComparisonPercent: calcGrowthPercent(interactions, prevInteractions),
        whatsappClicks: this.currentWhatsapp,
        whatsappComparisonPercent: calcGrowthPercent(this.currentWhatsapp, this.prevWhatsapp),
        phoneClicks: this.currentPhone,
        phoneComparisonPercent: calcGrowthPercent(this.currentPhone, this.prevPhone),
        websiteClicks: this.currentWebsite,
        websiteComparisonPercent: calcGrowthPercent(this.currentWebsite, this.prevWebsite),
        instagramClicks: this.currentInstagram,
        instagramComparisonPercent: calcGrowthPercent(this.currentInstagram, this.prevInstagram),
        routeClicks: this.currentRoute,
        routeComparisonPercent: calcGrowthPercent(this.currentRoute, this.prevRoute),
        shares: this.currentShares,
        sharesComparisonPercent: calcGrowthPercent(this.currentShares, this.prevShares),
        interactionRatePercent,
      },
      funnel: {
        views: this.currentViews,
        interactions,
        whatsapp: this.currentWhatsapp,
        routes: this.currentRoute,
      },
      dailyEvolution,
      trafficOrigins,
      acquisitionSources,
      discoverySources,
      actionRanking,
      geographicAggregation,
      dataCompleteness: {
        isComplete: !this.isTruncated,
        isSampled: this.isTruncated,
        isTruncated: this.isTruncated,
        totalProcessedEvents: this.totalProcessedEvents,
      },
    };
  }
}
