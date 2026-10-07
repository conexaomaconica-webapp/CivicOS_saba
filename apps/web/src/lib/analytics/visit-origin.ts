/**
 * Origem da visita (primeiro contato da sessão): de onde a pessoa veio até o guia. Entra em cada evento de analytics
 * como `origin`, para o painel mostrar, por exemplo, quantas visitas vieram do Google. Sem dados pessoais.
 */
export const VISIT_ORIGINS = [
  'organic_google',
  'organic_search',
  'ai_search',
  'social',
  'qr',
  'share',
  'email',
  'campaign',
  'referral',
  'directory',
  'direct',
] as const;

export type VisitOrigin = (typeof VISIT_ORIGINS)[number];

const SEARCH_ENGINES = /(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|brave\.com|yandex\.[a-z.]+|baidu\.com)$/;
const AI_HOSTS = /(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai|copilot\.microsoft\.com)$/;
const SOCIAL_HOSTS =
  /(^|\.)(facebook\.com|instagram\.com|l\.instagram\.com|lm\.facebook\.com|linkedin\.com|lnkd\.in|t\.co|twitter\.com|x\.com|youtube\.com|tiktok\.com|whatsapp\.com|wa\.me|t\.me|threads\.net)$/;

export function isVisitOrigin(value: unknown): value is VisitOrigin {
  return typeof value === 'string' && (VISIT_ORIGINS as readonly string[]).includes(value);
}

/** Decide a origem a partir do referrer e da query string da primeira página da sessão. */
export function classifyVisitOrigin(input: { referrer?: string | null; search?: string | null; ownHost: string }): VisitOrigin {
  const params = new URLSearchParams(input.search ?? '');
  const utmSource = (params.get('utm_source') ?? '').toLowerCase();
  const utmMedium = (params.get('utm_medium') ?? '').toLowerCase();

  if (utmSource === 'qr' || utmMedium === 'qr') return 'qr';
  if (utmSource === 'share' || utmMedium === 'share') return 'share';
  if (utmMedium === 'email' || utmSource === 'email' || utmSource === 'newsletter') return 'email';
  if (['cpc', 'ppc', 'paid', 'paidsocial', 'display', 'banner'].includes(utmMedium)) return 'campaign';
  if (utmSource === 'google' && utmMedium === 'organic') return 'organic_google';

  let referrerHost = '';
  try {
    referrerHost = input.referrer ? new URL(input.referrer).hostname.replace(/^www\./, '').toLowerCase() : '';
  } catch {
    referrerHost = '';
  }
  const own = input.ownHost.split(':')[0]!.replace(/^www\./, '').toLowerCase();

  if (!referrerHost) return utmSource ? 'campaign' : 'direct';
  if (referrerHost === own) return 'directory';
  if (AI_HOSTS.test(referrerHost)) return 'ai_search';
  if (/(^|\.)google\.[a-z.]+$/.test(referrerHost)) return 'organic_google';
  if (SEARCH_ENGINES.test(referrerHost)) return 'organic_search';
  if (SOCIAL_HOSTS.test(referrerHost)) return 'social';
  return 'referral';
}

const STORAGE_KEY = 'cm_visit_origin';

/** Origem já gravada nesta sessão do navegador, se houver. */
export function readStoredVisitOrigin(): VisitOrigin | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return isVisitOrigin(value) ? value : null;
  } catch {
    return null;
  }
}

/** Grava a origem só na primeira chamada da sessão (first-touch), a menos que `force` seja usado (ex.: QR code). */
export function captureVisitOrigin(force?: VisitOrigin): VisitOrigin | null {
  try {
    const existing = readStoredVisitOrigin();
    if (existing && !force) return existing;
    const origin =
      force ?? classifyVisitOrigin({ referrer: document.referrer, search: window.location.search, ownHost: window.location.host });
    window.sessionStorage.setItem(STORAGE_KEY, origin);
    return origin;
  } catch {
    return null;
  }
}
