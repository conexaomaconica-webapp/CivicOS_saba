import { NextResponse } from 'next/server';
import { isVisitOrigin } from '@/lib/analytics/visit-origin';
import { trackDirectoryEventAction, trackSearchImpressionsAction, type AllowedEventType } from '@/lib/analytics/analytics-service';

// Endpoint para sendBeacon/fetch keepalive: sobrevive à troca de página (Server Actions não sobrevivem).
// Reaproveita a mesma gravação e validações de trackDirectoryEventAction.

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENTS = new Set<AllowedEventType>([
  'view', 'whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'benefit_click',
  'social_click', 'service_view', 'instagram_click', 'share', 'benefit_claim', 'benefit_redeemed', 'qr_scan',
]);

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // sendBeacon de mesma origem pode não enviar Origin
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest\/0\./i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /skypeuripreview/i,
  /discordbot/i,
  /google page speed/i,
  /chrome-lighthouse/i,
  /telegrambot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /petalbot/i,
  /headlesschrome/i,
  /crawler/i,
  /spider/i,
  /robot/i,
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function isPrefetch(request: Request): boolean {
  const purpose = request.headers.get('purpose') || request.headers.get('sec-purpose') || request.headers.get('x-moz');
  return Boolean(purpose && purpose.toLowerCase().includes('prefetch'));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });

  // Descarta silenciosamente pré-carregamento do navegador e robôs conhecidos sem gravar no banco
  if (isPrefetch(request) || isBot(request.headers.get('user-agent'))) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 2000) return NextResponse.json({ ok: false }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { businessId, businessIds, eventType, source, origin, cycleId, city, state, device } = (body ?? {}) as {
    businessId?: unknown;
    businessIds?: unknown;
    eventType?: unknown;
    source?: unknown;
    origin?: unknown;
    cycleId?: unknown;
    city?: unknown;
    state?: unknown;
    device?: unknown;
  };

  // Aparições na busca chegam em lote (até 50 empresas).
  if (eventType === 'search_impression') {
    const ids = Array.isArray(businessIds) ? businessIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)).slice(0, 50) : [];
    if (ids.length === 0) return NextResponse.json({ ok: false }, { status: 400 });
    const result = await trackSearchImpressionsAction(ids, typeof source === 'string' ? source.slice(0, 60) : 'directory_list');
    return NextResponse.json({ ok: Boolean((result as { ok?: boolean }).ok) }, { status: 200 });
  }

  if (typeof businessId !== 'string' || !UUID.test(businessId)) return NextResponse.json({ ok: false }, { status: 400 });
  if (typeof eventType !== 'string' || !EVENTS.has(eventType as AllowedEventType)) return NextResponse.json({ ok: false }, { status: 400 });

  const result = await trackDirectoryEventAction({
    businessId,
    eventType: eventType as AllowedEventType,
    source: typeof source === 'string' ? source.slice(0, 60) : undefined,
    origin: isVisitOrigin(origin) ? origin : undefined,
    cycleId: typeof cycleId === 'string' ? cycleId.slice(0, 100) : undefined,
    city: typeof city === 'string' ? city.slice(0, 100) : undefined,
    state: typeof state === 'string' ? state.slice(0, 10) : undefined,
    device: typeof device === 'string' ? device.slice(0, 30) : undefined,
  });
  // Telemetria nunca devolve erro detalhado ao navegador.
  return NextResponse.json({ ok: Boolean((result as { ok?: boolean }).ok) }, { status: 200 });
}
