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
  | 'service_view';

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
