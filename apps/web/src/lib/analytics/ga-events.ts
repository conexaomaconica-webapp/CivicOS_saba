/**
 * Google Analytics 4: eventos de negócio das páginas públicas. Sem dados pessoais: só o tipo do evento e o slug
 * público da empresa (que já está na URL). Funções puras para poderem ser testadas.
 */

export type GaEventName =
  | 'view_business'
  | 'click_whatsapp'
  | 'click_phone'
  | 'click_directions'
  | 'click_instagram'
  | 'click_website'
  | 'share_business';

export type GaEvent = { name: GaEventName; params: Record<string, string> };

/** "/guia/otica-exemplo" -> "otica-exemplo". Listagens, cidade/categoria e QR não são página de empresa. */
export function businessSlugFromPath(pathname: string | null | undefined): string | null {
  const parts = (pathname ?? '').split('?')[0]!.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'guia') return null;
  const slug = parts[1]!;
  return ['empresas', 'lojas', 'eventos', 'beneficios'].includes(slug) ? null : slug;
}

/** Converte o clique em um link no evento correspondente (ou null se não for um contato rastreável). */
export function classifyLinkClick(href: string | null | undefined, ownHost: string, businessSlug: string | null): GaEvent | null {
  if (!href || !businessSlug) return null;
  const params = { business_slug: businessSlug };
  if (/^tel:/i.test(href)) return { name: 'click_phone', params };

  let url: URL;
  try {
    url = new URL(href, `https://${ownHost}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'web.whatsapp.com') return { name: 'click_whatsapp', params };
  if (host === 'instagram.com') return { name: 'click_instagram', params };
  if (/^(maps\.google|maps\.apple|waze)\./.test(host) || (host === 'google.com' && url.pathname.startsWith('/maps')) || host === 'goo.gl' || host === 'maps.app.goo.gl') {
    return { name: 'click_directions', params };
  }
  const own = ownHost.split(':')[0]!.replace(/^www\./, '');
  if (/^https?:$/.test(url.protocol) && host !== own && !['facebook.com', 'linkedin.com', 'youtube.com', 'youtu.be'].includes(host)) {
    return { name: 'click_website', params };
  }
  return null;
}

type Gtag = (...args: unknown[]) => void;

export function trackGaEvent(event: GaEvent): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('event', event.name, event.params);
}
