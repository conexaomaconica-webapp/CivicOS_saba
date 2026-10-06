'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { readVisitorKey } from '@/lib/referrals/attribution';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export type AllowedEventType =
  | 'view'
  | 'whatsapp_click'
  | 'phone_click'
  | 'website_click'
  | 'directions_click'
  | 'benefit_click'
  | 'social_click'
  | 'service_view'
  | 'search_impression'
  | 'instagram_click'
  | 'share'
  | 'benefit_claim'
  | 'benefit_redeemed'
  | 'event_checkin'
  | 'event_connection'
  | 'qr_scan';

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
  eventType: AllowedEventType;
  city?: string;
  state?: string;
  source?: string;
}) {
  const allowedEvents: AllowedEventType[] = [
    'view',
    'whatsapp_click',
    'phone_click',
    'website_click',
    'directions_click',
    'benefit_click',
    'social_click',
    'service_view',
    'search_impression',
    'instagram_click',
    'share',
    'benefit_claim',
    'benefit_redeemed',
    'event_checkin',
    'event_connection',
    'qr_scan',
  ];

  if (!payload.eventType || !allowedEvents.includes(payload.eventType)) {
    return { ok: false, error: 'INVALID_EVENT_TYPE' };
  }

  // A suíte unitária não possui conexão com o Supabase. Mantém o evento
  // não bloqueante apenas nesse ambiente; produção nunca mascara falha de gravação.
  if (process.env.NODE_ENV === 'test' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, skipped: true };
  }

  let sessionHash = '';
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const ua = reqHeaders.get('user-agent') || 'Browser';
    // Gera hash efêmero não reversível para deduplicação sem salvar IP bruto
    sessionHash = crypto.createHash('sha256').update(`${ip}_${ua}_${new Date().toISOString().slice(0, 10)}`).digest('hex').slice(0, 32);
  } catch (_e) {
    sessionHash = 'anon_session';
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

    const { error } = await (supabase as any).from('analytics_events').insert({
      tenant_id: business.tenant_id,
      business_id: payload.businessId,
      event_name: payload.eventType,
      pseudonymous_subject_id: sessionHash,
      metadata: {
        city: payload.city || null,
        state: payload.state || null,
        source: payload.source || 'direct',
      },
    });
    if (error) return { ok: false, error: error.message };

    // Funil de indicações: contato (WhatsApp, telefone, site, rota ou rede social) de quem chegou por um link de indicação.
    if (['whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'social_click'].includes(payload.eventType)) {
      try {
        const visitorKey = await readVisitorKey();
        if (visitorKey) {
          await (supabase as any).rpc('referral_record_contact', {
            p_business_id: payload.businessId,
            p_visitor_key: visitorKey,
            p_channel: payload.eventType.replace('_click', ''),
          });
        }
      } catch {}
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'ANALYTICS_WRITE_FAILED' };
  }
}

// Action 2: Buscar Resumo do Analytics para o Anunciante (7 / 30 / 90 dias)
export async function getAdvertiserAnalyticsSummaryAction(
  businessId: string,
  days: number = 30
): Promise<AnalyticsSummary> {
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
    sessionHash = crypto.createHash('sha256').update(`${ip}_${ua}_${new Date().toISOString().slice(0, 10)}`).digest('hex').slice(0, 32);
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

    const { error } = await (supabase as any).from('analytics_events').insert(
      businesses.map((b: { id: string; tenant_id: string }) => ({
        tenant_id: b.tenant_id,
        business_id: b.id,
        event_name: 'search_impression',
        pseudonymous_subject_id: sessionHash,
        source,
        metadata: { source },
      }))
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: businesses.length };
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
