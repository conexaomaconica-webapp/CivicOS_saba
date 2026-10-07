import { buildGaEvent } from '@/lib/analytics/events';
import type { GaEvent, GaEventName, GaParams } from '@/lib/analytics/types';

/**
 * Envio de eventos ao GA4 pelo navegador, com consentimento estrito (a mesma regra do componente GoogleAnalytics):
 * sem o "Aceitar" gravado, nada é enviado nem guardado. Como o gtag só existe depois do carregamento do script,
 * eventos disparados antes ficam numa fila curta e saem quando o GA fica pronto (evita perder o view_business da
 * primeira página).
 */
export const CONSENT_STORAGE_KEY = 'cm_analytics_consent';

const MAX_QUEUE = 25;
type Gtag = (...args: unknown[]) => void;

let ready = false;
const queue: GaEvent[] = [];

function consentGranted(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
  } catch {
    return false;
  }
}

function currentGtag(): Gtag | null {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof gtag === 'function' ? gtag : null;
}

function send(event: GaEvent): void {
  const gtag = currentGtag();
  if (gtag) gtag('event', event.name, event.params);
}

/** Chamado pelo componente GoogleAnalytics quando o gtag foi inicializado: descarrega a fila. */
export function markGaReady(): void {
  if (typeof window === 'undefined') return;
  ready = true;
  while (queue.length > 0) {
    const next = queue.shift();
    if (next && consentGranted()) send(next);
  }
}

/** Chamado quando o visitante recusa: esquece o que estava pendente. */
export function resetGa(): void {
  ready = false;
  queue.length = 0;
}

export function trackGaEvent(event: GaEvent): void {
  if (typeof window === 'undefined' || !consentGranted()) return;
  const clean = buildGaEvent(event.name, event.params);
  if (ready && currentGtag()) {
    send(clean);
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push(clean);
}

export function trackGa(name: GaEventName, params: GaParams = {}): void {
  trackGaEvent({ name, params });
}

/** Como `trackGa`, mas no máximo uma vez por sessão do navegador para a mesma chave (evita duplicar ao recarregar). */
export function trackGaOnce(onceKey: string, name: GaEventName, params: GaParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = `cm_ga_once_${onceKey}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    if (!consentGranted()) return; // sem consentimento não "gasta" a chance
    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // sem sessionStorage: dispara normalmente
  }
  trackGa(name, params);
}
