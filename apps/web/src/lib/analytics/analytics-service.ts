'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { headers } from 'next/headers';

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
    await supabase.rpc('record_directory_analytics_event', {
      p_business_id: payload.businessId,
      p_event_type: payload.eventType,
      p_city: payload.city || 'São Paulo',
      p_state: payload.state || 'SP',
      p_source: payload.source || 'direct',
      p_session_hash: sessionHash,
    });

    return { ok: true };
  } catch (_err) {
    return { ok: true, fallback: true };
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
