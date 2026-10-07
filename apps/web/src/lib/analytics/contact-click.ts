import type { AllowedEventType } from '@/lib/analytics/analytics-service';

/**
 * Qual evento de analytics um clique em link representa (WhatsApp, telefone, Instagram, redes sociais, rota, site).
 * Pura e sem dependências de navegador para ser testada. E-mails, âncoras e links internos não geram evento.
 */
export type ContactClickEvent = Extract<
  AllowedEventType,
  'whatsapp_click' | 'phone_click' | 'instagram_click' | 'social_click' | 'directions_click' | 'website_click' | 'share'
>;

const SOCIAL_HOSTS = new Set([
  'facebook.com', 'fb.com', 'm.facebook.com', 'linkedin.com', 'youtube.com', 'm.youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'tiktok.com', 'threads.net', 't.me',
]);

export function classifyContactClick(href: string | null | undefined, ownHost: string): ContactClickEvent | null {
  const value = (href ?? '').trim();
  if (!value || value.startsWith('#')) return null;
  if (/^tel:/i.test(value)) return 'phone_click';
  if (/^(mailto|sms|javascript|data|file):/i.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, `https://${ownHost}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.replace(/^www\./, '');
  const own = ownHost.split(':')[0]!.replace(/^www\./, '');
  if (host === own) return null;

  if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'web.whatsapp.com') {
    // wa.me/?text=... (sem número) é o botão de indicar/compartilhar, não contato com a empresa.
    const hasNumber = host === 'wa.me' ? url.pathname.replace(/\//g, '').length > 0 : Boolean(url.searchParams.get('phone'));
    return hasNumber ? 'whatsapp_click' : 'share';
  }
  if (host === 'instagram.com' || host === 'instagr.am') return 'instagram_click';
  if (SOCIAL_HOSTS.has(host)) return 'social_click';
  if (
    /^(maps\.google|maps\.apple|waze)\./.test(host) ||
    host === 'goo.gl' ||
    host === 'maps.app.goo.gl' ||
    (host === 'google.com' && url.pathname.startsWith('/maps'))
  ) {
    return 'directions_click';
  }
  return 'website_click';
}
