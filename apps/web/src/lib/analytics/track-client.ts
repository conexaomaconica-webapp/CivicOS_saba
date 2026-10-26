'use client';

import type { AllowedEventType } from '@/lib/analytics/analytics-service';
import { readStoredVisitOrigin } from '@/lib/analytics/visit-origin';

let currentCycleId: string | null = null;
let currentBusinessId: string | null = null;

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

export interface TrackEventPayload {
  businessId: string;
  eventType: AllowedEventType;
  source?: string;
  cycleId?: string;
  city?: string;
  state?: string;
  device?: string;
}

/**
 * Registra um evento do Guia de forma que sobreviva à navegação (clique que troca de página, link em nova aba
 * que tira o foco). Usa sendBeacon e, se indisponível ou recusado, fetch com keepalive. Nunca lança erro.
 */
export function trackEvent(payload: TrackEventPayload): void {
  try {
    const cycleId = payload.eventType === 'view' ? (payload.cycleId || getOrCreateNavigationCycleId(payload.businessId)) : payload.cycleId;
    const body = JSON.stringify({
      ...payload,
      cycleId,
      device: payload.device || 'web',
      origin: readStoredVisitOrigin() ?? undefined,
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon('/api/analytics/track', new Blob([body], { type: 'application/json' }));
      if (queued) return;
    }
    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Telemetria não pode quebrar a ação do usuário.
  }
}
