/**
 * Telemetria de Analytics do Aplicativo Móvel (Capacitor)
 * 
 * Modelo canônico alinhado ao backend da Conexão Maçônica.
 * Utiliza o endpoint seguro /api/analytics/track sem expor credenciais privilegiadas.
 * Isolamento garantido por tenant no backend e device marcado como 'mobile_app'.
 */

export type MobileAnalyticsEventType =
  | 'view'
  | 'whatsapp'
  | 'phone'
  | 'website'
  | 'instagram'
  | 'route'
  | 'share';

export interface MobileTrackOptions {
  businessId: string;
  eventType: MobileAnalyticsEventType;
  source?: string;
  city?: string | null;
  state?: string | null;
  cycleId?: string;
}

const activeCycleIds = new Map<string, string>();

/**
 * Retorna ou cria um ID de ciclo efêmero para visualizações do anunciante no app.
 * Garante que a abertura do modal registre apenas 1 view mesmo com re-renderizações do React.
 */
export function createFreshMobileCycleId(): string {
  return `mob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getOrCreateMobileCycleId(businessId: string): string {
  if (!businessId) return '';
  const existing = activeCycleIds.get(businessId);
  if (existing) return existing;

  const newId = createFreshMobileCycleId();
  activeCycleIds.set(businessId, newId);
  return newId;
}

/**
 * Reseta o ciclo ao fechar o modal, permitindo que uma nova abertura posterior registre view legítima.
 */
export function resetMobileCycleId(businessId: string): void {
  activeCycleIds.delete(businessId);
}

function resolveAnalyticsEndpoint(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const customUrl = env?.VITE_ANALYTICS_API_URL?.trim() || env?.VITE_PUBLIC_SITE_URL?.trim();
  if (customUrl) {
    return `${customUrl.replace(/\/+$/, '')}/api/analytics/track`;
  }
  return 'https://www.conexaomaconica.com.br/api/analytics/track';
}

/**
 * Envia evento de telemetria do app móvel de forma assíncrona e resiliente.
 */
export async function trackMobileEvent(
  options: MobileTrackOptions,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; deduplicated?: boolean; skipped?: boolean; viewsCount?: number; error?: string }> {
  if (!options.businessId || !options.eventType) {
    return { ok: false, error: 'MISSING_PARAMS' };
  }

  const cycleId =
    options.eventType === 'view'
      ? options.cycleId || getOrCreateMobileCycleId(options.businessId)
      : undefined;

  const payload = {
    businessId: options.businessId,
    eventType: options.eventType,
    source: options.source || 'app_mobile',
    discoverySource: 'direct_link',
    acquisitionSource: 'direct',
    cycleId,
    city: options.city || undefined,
    state: options.state || undefined,
    device: 'mobile_app',
  };

  const endpoint = resolveAnalyticsEndpoint();
  const maxAttempts = 2;
  let lastError = 'NETWORK_ERROR';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'mobile_app',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        lastError = `HTTP_${res.status}`;
        if (res.status >= 400 && res.status < 500) {
          return { ok: false, error: lastError };
        }
        continue;
      }

      const data = await res.json().catch(() => ({ ok: true }));
      return { ok: true, ...data };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'NETWORK_ERROR';
    }
  }

  return { ok: false, error: lastError };
}
