/**
 * Normalização Canônica de Eventos de Analytics (Web + Mobile App)
 * 
 * Arquivo utilitário puro (sem diretiva 'use server'), permitindo importação
 * segura tanto em Server Actions, rotas de API (Route Handlers) e componentes cliente.
 */

export const CANONICAL_ANALYTICS_EVENTS = [
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
] as const;

export type AllowedEventType = typeof CANONICAL_ANALYTICS_EVENTS[number];

export const EVENT_NORMALIZATION_MAP: Record<string, AllowedEventType> = {
  // Canônicos
  view: 'view',
  whatsapp_click: 'whatsapp_click',
  phone_click: 'phone_click',
  website_click: 'website_click',
  directions_click: 'directions_click',
  benefit_click: 'benefit_click',
  social_click: 'social_click',
  service_view: 'service_view',
  search_impression: 'search_impression',
  instagram_click: 'instagram_click',
  share: 'share',
  benefit_claim: 'benefit_claim',
  benefit_redeemed: 'benefit_redeemed',
  event_checkin: 'event_checkin',
  event_connection: 'event_connection',
  qr_scan: 'qr_scan',

  // Aliases do aplicativo móvel (Capacitor)
  whatsapp: 'whatsapp_click',
  phone: 'phone_click',
  website: 'website_click',
  instagram: 'instagram_click',
  route: 'directions_click',

  // Aliases legados e variantes
  page_view: 'view',
  profile_view: 'view',
  route_click: 'directions_click',
  profile_share: 'share',
};

/**
 * Normaliza strings de eventos recebidas da web ou do app para o vocabulário oficial
 */
export function normalizeAnalyticsEventType(raw: unknown): AllowedEventType | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return EVENT_NORMALIZATION_MAP[normalized] ?? null;
}
