'use client';

import type { AllowedEventType } from '@/lib/analytics/analytics-service';
import { readStoredVisitOrigin } from '@/lib/analytics/visit-origin';

/**
 * Registra um evento do Guia de forma que sobreviva à navegação (clique que troca de página, link em nova aba
 * que tira o foco). Usa sendBeacon e, se indisponível ou recusado, fetch com keepalive. Nunca lança erro.
 */
export function trackEvent(payload: { businessId: string; eventType: AllowedEventType; source?: string }): void {
  try {
    // origin = de onde a visita veio (Google, QR, compartilhamento...), gravada na primeira página da sessão.
    const body = JSON.stringify({ ...payload, origin: readStoredVisitOrigin() ?? undefined });
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
