'use client';

import type { AllowedEventType } from '@/lib/analytics/analytics-service';
import {
  type AcquisitionSource,
  type DiscoverySource,
  captureAcquisitionSource,
  normalizeDiscoverySource,
} from '@/lib/analytics/traffic-sources';

let currentCycleId: string | null = null;
let currentBusinessId: string | null = null;
const sentViewCycles = new Set<string>();

/**
 * Retorna o identificador do ciclo de navegação atual.
 * - Em reloads manuais (F5) o script é recarregado e um novo ID é gerado.
 * - Em re-renderizações React ou navegação na mesma página, o ID é preservado.
 * - Ao navegar via SPA para outra empresa, um novo ID é gerado.
 */
export function getOrCreateNavigationCycleId(businessId?: string): string {
  if (typeof window === 'undefined') return 'ssr_cycle';
  if (!currentCycleId || (businessId && currentBusinessId !== businessId)) {
    currentCycleId = `cycle_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    currentBusinessId = businessId ?? null;
  }
  return currentCycleId;
}

/**
 * Reseta o ciclo de navegação (útil para testes unitários ou reset explícito de sessão).
 */
export function resetNavigationCycle(businessId?: string): void {
  currentCycleId = null;
  currentBusinessId = businessId ?? null;
  sentViewCycles.clear();
}

export interface TrackEventPayload {
  businessId: string;
  eventType: AllowedEventType;
  source?: string;
  origin?: string;
  acquisitionSource?: AcquisitionSource;
  discoverySource?: DiscoverySource;
  cycleId?: string;
  city?: string;
  state?: string;
  device?: string;
}

/**
 * Resolve a origem de descoberta (onde o usuário encontrou a empresa na plataforma)
 * baseando-se na intenção explícita passada no payload ou nos parâmetros de navegação atuais.
 */
function resolveClientDiscoverySource(payload: TrackEventPayload): DiscoverySource {
  if (payload.discoverySource) {
    return normalizeDiscoverySource(payload.discoverySource);
  }
  if (payload.source && payload.source !== 'business_profile') {
    return normalizeDiscoverySource(payload.source);
  }

  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSrc = params.get('src') || params.get('discovery') || params.get('origem');
      if (urlSrc) {
        return normalizeDiscoverySource(urlSrc);
      }

      // Inferência via referrer interno
      const ref = document.referrer;
      if (ref && ref.includes(window.location.host)) {
        if (ref.includes('#mapa') || ref.includes('view=map')) return 'map';
        if (ref.includes('q=')) return 'text_search';
        if (ref.includes('cat=')) return 'category';
        if (ref.includes('/beneficios')) return 'benefits_club';
        if (ref.includes('/lojas')) return 'lodges_guide';
      }
    } catch {
      // Ignora erro em ambientes sem window
    }
  }

  return 'direct_link';
}

/**
 * Envia o payload de telemetria com retry automático e backoff exponencial em caso de falha transitória de rede.
 */
export async function sendTrackPayloadWithRetry(
  body: string,
  cycleId?: string,
  options: { maxRetries?: number; initialDelayMs?: number } = {}
): Promise<boolean> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelayMs ?? 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });

      if (response.ok) {
        if (cycleId) {
          sentViewCycles.add(cycleId);
        }
        return true;
      }
      // Status 4xx que não sejam de rede/servidor (ex: 400 Bad Request, 403 Forbidden) não devem sofrer retry
      if (response.status >= 400 && response.status < 500) {
        if (cycleId) {
          sentViewCycles.delete(cycleId);
        }
        return false;
      }
    } catch {
      // Falha de rede transitória: libera o cycleId para não bloquear reenvios legítimos
      // enquanto o loop tenta novamente em background
      if (cycleId) {
        sentViewCycles.delete(cycleId);
      }
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return false;
}

/**
 * Registra um evento do Guia de forma que sobreviva à navegação (sendBeacon / fetch keepalive).
 * Aplica deduplicação por cycleId, separação de aquisição/descoberta e resiliência a falhas de rede com retry automático.
 */
export function trackEvent(payload: TrackEventPayload): void {
  try {
    let cycleId = payload.cycleId;
    if (payload.eventType === 'view') {
      cycleId = payload.cycleId || getOrCreateNavigationCycleId(payload.businessId);
      if (sentViewCycles.has(cycleId)) {
        // Ciclo de visualização já transmitido neste contexto do cliente.
        // Previne chamadas redundantes por re-render, StrictMode ou listeners repetidos.
        return;
      }
      sentViewCycles.add(cycleId);
      if (sentViewCycles.size > 200) {
        const oldest = sentViewCycles.values().next().value;
        if (oldest) sentViewCycles.delete(oldest);
      }
    }

    const acquisitionSource =
      payload.acquisitionSource ?? captureAcquisitionSource();
    const discoverySource = resolveClientDiscoverySource(payload);

    const body = JSON.stringify({
      ...payload,
      cycleId,
      device: payload.device || 'web',
      acquisitionSource,
      discoverySource,
      // Retrocompatibilidade garantida com campos legados
      source: payload.source || discoverySource,
      origin: payload.origin || acquisitionSource,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon('/api/analytics/track', new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }

    void sendTrackPayloadWithRetry(body, cycleId);
  } catch {
    // Telemetria nunca quebra a navegação do usuário.
  }
}
