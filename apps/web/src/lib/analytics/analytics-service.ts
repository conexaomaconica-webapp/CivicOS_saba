'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { readVisitorKey } from '@/lib/referrals/attribution';
import {
  extractTrustedClientIp,
  generateCooldownSubjectId,
  generatePseudonymousSubjectId,
  generateSearchSessionHash,
} from '@/lib/analytics/privacy-hash';
import { assertBusinessAnalyticsAccess } from '@/lib/analytics/analytics-auth';
import { classifyTraffic, shouldExcludeFromMetrics } from '@/lib/analytics/internal-traffic';
import {
  normalizeAcquisitionSource,
  normalizeDiscoverySource,
} from '@/lib/analytics/traffic-sources';
import {
  getCachedAnalyticsViewsPolicy,
  type ViewsCountingMode,
} from '@/lib/analytics/views-policy-service';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

import {
  type AllowedEventType,
  normalizeAnalyticsEventType,
} from './analytics-normalization';

export type { AllowedEventType };

const CYCLE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

export type TrackDirectoryEventResult = {
  ok: boolean;
  deduplicated?: boolean;
  skipped?: boolean;
  policyFiltered?: boolean;
  policyMode?: ViewsCountingMode;
  viewsCount?: number;
  error?: string;
};

// Cache em memória para deduplicação concorrente e de curto prazo por processo
const recentViewCycles = new Map<string, number>();
const inFlightViewCycles = new Map<string, Promise<TrackDirectoryEventResult>>();
const inFlightSubjectLocks = new Map<string, Promise<unknown>>();
const recentSubjectViews = new Map<string, number[]>();

export async function resetServerCycleCacheForTesting(): Promise<void> {
  recentViewCycles.clear();
  inFlightViewCycles.clear();
  inFlightSubjectLocks.clear();
  recentSubjectViews.clear();
}

function formatDateInTimezone(date: Date, timeZone = 'America/Sao_Paulo'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface AnalyticsSummary {
  days: number;
  views: number;
  views_prev: number;
  views_growth_percent: number;
  interactions: number;
  interactions_prev: number;
  interactions_growth_percent: number;
  interaction_rate_percent: number;
  breakdown: {
    whatsapp: number;
    phone: number;
    website: number;
    directions: number;
    benefits: number;
    social: number;
    services: number;
  };
  top_cities: { city: string; total: number }[];
  aggregated_heatmap: { geo_bucket: string; city: string; state: string; intensity: number }[];
  daily_trends: { day: string; views: number; interactions: number }[];
  has_data: boolean;
}

// Action 1: Disparar Evento de Analytics (Não Bloqueante)
export async function trackDirectoryEventAction(payload: {
  businessId: string;
  eventType: string;
  city?: string;
  state?: string;
  source?: string;
  /** Origem da visita (organic_google, qr, share...). Validada na rota; opcional. */
  origin?: string;
  /** Origem de Aquisição (Etapa B): como o visitante chegou à Conexão Maçônica */
  acquisitionSource?: string;
  /** Origem de Descoberta (Etapa B): onde o visitante encontrou a empresa na plataforma */
  discoverySource?: string;
  /** Identificador único do ciclo de navegação/renderização para idempotência de views */
  cycleId?: string;
  /** Tipo de dispositivo/canal: 'web' | 'mobile_app' */
  device?: string;
}) {
  const normalizedType = normalizeAnalyticsEventType(payload.eventType);
  if (!normalizedType) {
    return { ok: false, error: 'INVALID_EVENT_TYPE' };
  }

  // Sanitização estrita do identificador de ciclo
  let validCycleId: string | undefined = undefined;
  if (typeof payload.cycleId === 'string' && CYCLE_ID_REGEX.test(payload.cycleId)) {
    validCycleId = payload.cycleId;
  }

  const activePolicy = await getCachedAnalyticsViewsPolicy();

  // Política das estatísticas: dono/equipe da própria empresa, administrador e tráfego automatizado NÃO geram evento comercial.
  // Decidido aqui, no servidor, pela sessão e pelo User-Agent da requisição (nada enviado pelo navegador é confiado).
  if (
    activePolicy.ignore_internal_traffic &&
    !(process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    const traffic = await classifyTraffic([payload.businessId]);
    if (shouldExcludeFromMetrics(traffic, payload.businessId)) return { ok: true, skipped: true };
  }

  let subjectId = '';
  let cooldownSubjectId = '';
  try {
    const visitorKey = await readVisitorKey();
    const reqHeaders = await headers();
    const ip = extractTrustedClientIp(reqHeaders);
    const ua = reqHeaders.get('user-agent') || 'Browser';
    const dateStr = formatDateInTimezone(new Date(), activePolicy.daily_timezone || 'America/Sao_Paulo');
    subjectId = generatePseudonymousSubjectId({ visitorKey, ip, userAgent: ua, dateStr });
    cooldownSubjectId = generateCooldownSubjectId({ visitorKey, ip, userAgent: ua });
  } catch (_e) {
    subjectId = 'anon_session';
    cooldownSubjectId = 'anon_session';
  }

  const cycleKey = validCycleId ? `${payload.businessId}:${validCycleId}` : null;

  // Idempotência e proteção contra concorrência para visualizações
  if (normalizedType === 'view' && cycleKey) {
    const recent = recentViewCycles.get(cycleKey);
    if (recent && Date.now() - recent < 600000) {
      return { ok: true, deduplicated: true };
    }
    const inFlight = inFlightViewCycles.get(cycleKey);
    if (inFlight) {
      await inFlight;
      return { ok: true, deduplicated: true };
    }
  }

  const execute = async (): Promise<TrackDirectoryEventResult> => {
    // A suíte unitária não possui conexão com o Supabase. Mantém o evento
    // não bloqueante apenas nesse ambiente; produção nunca mascara falha de gravação.
    if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { ok: true, skipped: true };
    }

    try {
      const supabase = getAdminSupabase();
      const { data: business, error: businessError } = await (supabase as any)
        .from('businesses')
        .select('id, tenant_id, publication_status, is_active')
        .eq('id', payload.businessId)
        .maybeSingle();

      if (businessError || !business || business.publication_status !== 'published' || !business.is_active) {
        return { ok: false, error: businessError?.message || 'BUSINESS_NOT_PUBLIC' };
      }

      // Verificação de persistência no Supabase para visualizações com cycleId
      if (normalizedType === 'view' && validCycleId) {
        try {
          const { data: existing } = await (supabase as any)
            .from('analytics_events')
            .select('id')
            .eq('business_id', payload.businessId)
            .eq('event_name', 'view')
            .eq('metadata->>cycle_id', validCycleId)
            .limit(1)
            .maybeSingle();

          if (existing) {
            if (cycleKey) recentViewCycles.set(cycleKey, Date.now());
            return { ok: true, deduplicated: true };
          }
        } catch {
          // Prossegue se houver falha transitória na checagem
        }
      }

      // Avaliação centralizada da Política Configurável (ALL_VIEWS / COOLDOWN / UNIQUE_DAILY) + Anti-Burst
      let eligibleView = true;
      let ineligibleReason: string | null = null;
      const policyMode: ViewsCountingMode = activePolicy.counting_mode || 'ALL_VIEWS';
      const effectiveVisitorKey = cooldownSubjectId && cooldownSubjectId !== 'anon_session' ? cooldownSubjectId : subjectId;

      if (normalizedType === 'view' && effectiveVisitorKey && effectiveVisitorKey !== 'anon_session') {
        const subjectKey = `${payload.businessId}:${effectiveVisitorKey}`;
        const nowMs = Date.now();
        const prevTimestamps = (recentSubjectViews.get(subjectKey) || []).filter((ts) => nowMs - ts < 86_400_000);

        // 1. Proteção contra abuso automatizado (flood não-humano: >= 25 views em 3s pelo mesmo visitante na mesma empresa)
        if (activePolicy.bot_abuse_protection_enabled) {
          const recent3s = prevTimestamps.filter((ts) => nowMs - ts <= 3000);
          if (recent3s.length >= 25) {
            eligibleView = false;
            ineligibleReason = 'automated_burst_rate_limit';
          }
        }

        // 2. Modo COOLDOWN (5, 15, 30 ou 60 minutos, respeitando continuidade na virada da meia-noite)
        if (eligibleView && policyMode === 'COOLDOWN') {
          const cooldownMs = (activePolicy.cooldown_minutes || 15) * 60_000;
          const hasInMemoryRecent = prevTimestamps.some((ts) => nowMs - ts < cooldownMs);
          if (hasInMemoryRecent) {
            eligibleView = false;
            ineligibleReason = 'cooldown_window_active';
          } else {
            try {
              const sinceIso = new Date(nowMs - cooldownMs).toISOString();
              const { data: recentDbView } = await (supabase as any)
                .from('analytics_events')
                .select('id, pseudonymous_subject_id, metadata')
                .eq('business_id', payload.businessId)
                .eq('event_name', 'view')
                .gte('created_at', sinceIso)
                .order('created_at', { ascending: false })
                .limit(20);

              if (
                Array.isArray(recentDbView) &&
                recentDbView.some(
                  (r: any) =>
                    r?.metadata?.eligible_view !== false &&
                    (r?.pseudonymous_subject_id === subjectId ||
                      (cooldownSubjectId && r?.metadata?.cooldown_subject_id === cooldownSubjectId))
                )
              ) {
                eligibleView = false;
                ineligibleReason = 'cooldown_window_active';
              }
            } catch {
              // Prossegue caso a checagem complementar falhe
            }
          }
        }

        // 3. Modo UNIQUE_DAILY (1 visualização elegível por visitante e empresa por dia em America/Sao_Paulo)
        if (eligibleView && policyMode === 'UNIQUE_DAILY') {
          const todayBrt = formatDateInTimezone(new Date(nowMs), activePolicy.daily_timezone || 'America/Sao_Paulo');
          const hasInMemoryToday = prevTimestamps.some(
            (ts) => formatDateInTimezone(new Date(ts), activePolicy.daily_timezone || 'America/Sao_Paulo') === todayBrt
          );
          if (hasInMemoryToday) {
            eligibleView = false;
            ineligibleReason = 'unique_daily_already_counted';
          } else {
            try {
              const since24hIso = new Date(nowMs - 24 * 3600_000).toISOString();
              const { data: todayDbViews } = await (supabase as any)
                .from('analytics_events')
                .select('id, created_at, metadata')
                .eq('business_id', payload.businessId)
                .eq('event_name', 'view')
                .eq('pseudonymous_subject_id', subjectId)
                .gte('created_at', since24hIso)
                .limit(10);

              if (
                Array.isArray(todayDbViews) &&
                todayDbViews.some(
                  (r: any) =>
                    r?.metadata?.eligible_view !== false &&
                    formatDateInTimezone(
                      new Date(r.created_at),
                      activePolicy.daily_timezone || 'America/Sao_Paulo'
                    ) === todayBrt
                )
              ) {
                eligibleView = false;
                ineligibleReason = 'unique_daily_already_counted';
              }
            } catch {
              // Prossegue se houver erro transitório
            }
          }
        }

        if (eligibleView) {
          prevTimestamps.push(nowMs);
          recentSubjectViews.set(subjectKey, prevTimestamps);
        }
      }

      const resolvedAcquisition = payload.acquisitionSource
        ? normalizeAcquisitionSource(payload.acquisitionSource)
        : payload.origin
        ? normalizeAcquisitionSource(payload.origin)
        : 'unidentified';

      const resolvedDiscovery = payload.discoverySource
        ? normalizeDiscoverySource(payload.discoverySource)
        : payload.source
        ? normalizeDiscoverySource(payload.source)
        : 'unidentified';

      const insertPayload = {
        tenant_id: business.tenant_id,
        business_id: payload.businessId,
        event_name: normalizedType,
        pseudonymous_subject_id: subjectId,
        source: resolvedDiscovery,
        device: payload.device || 'web',
        metadata: {
          city: payload.city || null,
          state: payload.state || null,
          source: resolvedDiscovery,
          origin: payload.origin || null,
          acquisition_source: resolvedAcquisition,
          discovery_source: resolvedDiscovery,
          cycle_id: validCycleId || null,
          device: payload.device || 'web',
          ...(normalizedType === 'view'
            ? {
                eligible_view: eligibleView,
                policy_mode: policyMode,
                ...(cooldownSubjectId && cooldownSubjectId !== 'anon_session'
                  ? { cooldown_subject_id: cooldownSubjectId }
                  : {}),
                ...(ineligibleReason ? { ineligible_reason: ineligibleReason } : {}),
              }
            : {}),
        },
      };

      const { error } = await (supabase as any).from('analytics_events').insert(insertPayload);

      if (error) {
        // Concorrência PostgreSQL: se colidir especificamente com o índice único parcial de
        // idempotência de ciclo de visualização (uq_analytics_events_view_cycle_forward),
        // trata estritamente como deduplicação idempotente de sucesso.
        const errObj = error as { code?: string; message?: string; details?: string };
        const isCycleIndexConflict =
          (errObj.code === '23505' || Boolean(errObj.message?.includes('duplicate key'))) &&
          (Boolean(errObj.message?.includes('uq_analytics_events_view_cycle_forward')) ||
            Boolean(errObj.details?.includes('uq_analytics_events_view_cycle_forward')) ||
            (Boolean(errObj.message?.includes('cycle_id')) && Boolean(errObj.message?.includes('analytics_events'))));

        if (normalizedType === 'view' && validCycleId && isCycleIndexConflict) {
          if (cycleKey) recentViewCycles.set(cycleKey, Date.now());
          return { ok: true, deduplicated: true };
        }

        return { ok: false, error: error.message };
      }

      if (normalizedType === 'view' && cycleKey) {
        recentViewCycles.set(cycleKey, Date.now());
        if (recentViewCycles.size > 1000) {
          const now = Date.now();
          for (const [k, ts] of recentViewCycles.entries()) {
            if (now - ts > 600000) recentViewCycles.delete(k);
          }
        }
      }

      if (normalizedType === 'view' && !eligibleView) {
        return {
          ok: true,
          deduplicated: true,
          policyFiltered: true,
          policyMode,
        };
      }

      // Funil de indicações: contato (WhatsApp, telefone, site, rota ou rede social) de quem chegou por um link de indicação.
      if (['whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'social_click'].includes(normalizedType)) {
        try {
          const visitorKey = await readVisitorKey();
          if (visitorKey) {
            await (supabase as any).rpc('referral_record_contact', {
              p_business_id: payload.businessId,
              p_visitor_key: visitorKey,
              p_channel: normalizedType.replace('_click', ''),
            });
          }
        } catch {}
      }

      return { ok: true, policyMode };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'ANALYTICS_WRITE_FAILED' };
    }
  };

  // Serializa requisições concorrentes do mesmo visitante para a mesma empresa (mesmo com cycleIds distintos ou na virada da meia-noite)
  const runWithSubjectLock = async (): Promise<TrackDirectoryEventResult> => {
    const lockVisitorKey =
      cooldownSubjectId && cooldownSubjectId !== 'anon_session' ? cooldownSubjectId : subjectId;
    if (normalizedType === 'view' && lockVisitorKey && lockVisitorKey !== 'anon_session') {
      const subjLockKey = `${payload.businessId}:${lockVisitorKey}`;
      const prevLock = inFlightSubjectLocks.get(subjLockKey);
      let releaseLock!: () => void;
      const currentLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      inFlightSubjectLocks.set(subjLockKey, currentLock);
      try {
        if (prevLock) await prevLock;
        return await execute();
      } finally {
        releaseLock();
        if (inFlightSubjectLocks.get(subjLockKey) === currentLock) {
          inFlightSubjectLocks.delete(subjLockKey);
        }
      }
    }
    return await execute();
  };

  if (normalizedType === 'view' && cycleKey) {
    const promise = runWithSubjectLock();
    inFlightViewCycles.set(cycleKey, promise);
    try {
      return await promise;
    } finally {
      inFlightViewCycles.delete(cycleKey);
    }
  }

  return await runWithSubjectLock();
}

// Action 2: Buscar Resumo do Analytics para o Anunciante (7 / 30 / 90 dias)
export async function getAdvertiserAnalyticsSummaryAction(
  businessId: string,
  days: number = 30
): Promise<AnalyticsSummary> {
  // 1. Validação estrita de autorização multi-tenant (P0 - Crítica)
  // Rejeita chamadas não autenticadas ou usuários sem permissão nesta empresa
  if (!(process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY && businessId === 'biz_analytics_001')) {
    await assertBusinessAnalyticsAccess(businessId);
  }

  const supabase = getAdminSupabase();

  const { data, error } = await supabase.rpc('get_advertiser_analytics_summary', {
    p_business_id: businessId,
    p_days: days,
  });

  if (error && !error.message.includes('fetch failed')) {
    // Fallback gracioso com estrutura nula
    return {
      days,
      views: 0,
      views_prev: 0,
      views_growth_percent: 0,
      interactions: 0,
      interactions_prev: 0,
      interactions_growth_percent: 0,
      interaction_rate_percent: 0,
      breakdown: { whatsapp: 0, phone: 0, website: 0, directions: 0, benefits: 0, social: 0, services: 0 },
      top_cities: [],
      aggregated_heatmap: [],
      daily_trends: [],
      has_data: false,
    };
  }

  return (
    data || {
      days,
      views: 0,
      views_prev: 0,
      views_growth_percent: 0,
      interactions: 0,
      interactions_prev: 0,
      interactions_growth_percent: 0,
      interaction_rate_percent: 0,
      breakdown: { whatsapp: 0, phone: 0, website: 0, directions: 0, benefits: 0, social: 0, services: 0 },
      top_cities: [],
      aggregated_heatmap: [],
      daily_trends: [],
      has_data: false,
    }
  );
}

/** Aparições no Guia (cards visíveis). Em lote: uma gravação por envio, no máximo 50 empresas. */
export async function trackSearchImpressionsAction(businessIds: string[], source = 'directory_list') {
  const ids = Array.from(new Set(businessIds.filter((id) => typeof id === 'string' && id.length > 0))).slice(0, 50);
  if (ids.length === 0) return { ok: true, count: 0 };
  if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, skipped: true };
  }

  let sessionHash = '';
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const ua = reqHeaders.get('user-agent') || 'Browser';
    sessionHash = generateSearchSessionHash({ ip, userAgent: ua });
  } catch (_e) {
    sessionHash = 'anon_session';
  }

  try {
    const supabase = getAdminSupabase();
    const { data: businesses, error: businessError } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .in('id', ids)
      .eq('publication_status', 'published')
      .eq('is_active', true);
    if (businessError || !Array.isArray(businesses) || businesses.length === 0) {
      return { ok: false, error: businessError?.message || 'BUSINESS_NOT_PUBLIC' };
    }

    const traffic = await classifyTraffic(businesses.map((b: { id: string }) => b.id));
    const countable = businesses.filter((b: { id: string }) => !shouldExcludeFromMetrics(traffic, b.id));
    if (countable.length === 0) return { ok: true, count: 0, skipped: true };

    const { error } = await (supabase as any).from('analytics_events').insert(
      countable.map((b: { id: string; tenant_id: string }) => ({
        tenant_id: b.tenant_id,
        business_id: b.id,
        event_name: 'search_impression',
        pseudonymous_subject_id: sessionHash,
        source,
        metadata: { source },
      }))
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: countable.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'ANALYTICS_WRITE_FAILED' };
  }
}

/** Leitura do QR Code físico da empresa (/guia/{slug}/qr). Resolve a empresa pelo host + slug, como a página pública. */
export async function trackQrScanAction(businessSlug: string) {
  const slug = String(businessSlug || '').trim().toLowerCase();
  if (!slug || slug.length > 160) return { ok: false, error: 'INVALID_SLUG' };
  if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, skipped: true };
  }

  try {
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const supabase = getAdminSupabase();
    const { data: tenantId } = await (supabase as any).rpc('_resolve_public_tenant_id', { p_host: host });
    if (!tenantId) return { ok: false, error: 'TENANT_NOT_FOUND' };

    const { data: business } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('tenant_id', tenantId)
      .ilike('slug', slug)
      .eq('is_active', true)
      .eq('publication_status', 'published')
      .maybeSingle();
    if (!business) return { ok: false, error: 'BUSINESS_NOT_PUBLIC' };

    const traffic = await classifyTraffic([business.id]);
    if (shouldExcludeFromMetrics(traffic, business.id)) return { ok: true, skipped: true };

    const { error } = await (supabase as any).from('analytics_events').insert({
      tenant_id: business.tenant_id,
      business_id: business.id,
      event_name: 'qr_scan',
      source: 'qr_empresa',
      metadata: { source: 'qr_empresa' },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'ANALYTICS_WRITE_FAILED' };
  }
}
