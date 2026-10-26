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
export function getOrCreateMobileCycleId(businessId: string): string {
  if (!businessId) return '';
  const existing = activeCycleIds.get(businessId);
  if (existing) return existing;

  const newId = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
  return 'https://conexaomaconica.com.br/api/analytics/track';
}

/**
 * Envia evento de telemetria do app móvel de forma assíncrona e resiliente.
 */
export async function trackMobileEvent(
  options: MobileTrackOptions,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
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
    cycleId,
    city: options.city || undefined,
    state: options.state || undefined,
    device: 'mobile_app',
  };

  try {
    const endpoint = resolveAnalyticsEndpoint();
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP_${res.status}` };
    }

    const data = await res.json().catch(() => ({ ok: true }));
    return { ok: true, ...data };
  } catch (err) {
    // Falha silenciosa para nunca quebrar a interface em caso de oscilação de rede móvel
    return { ok: false, error: err instanceof Error ? err.message : 'NETWORK_ERROR' };
  }
}
