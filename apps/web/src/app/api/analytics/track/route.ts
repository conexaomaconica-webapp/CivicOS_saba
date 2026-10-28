import { NextResponse } from 'next/server';
import { isVisitOrigin } from '@/lib/analytics/visit-origin';
import {
  normalizeAcquisitionSource,
  normalizeDiscoverySource,
} from '@/lib/analytics/traffic-sources';
import { normalizeAnalyticsEventType } from '@/lib/analytics/analytics-normalization';
import {
  trackDirectoryEventAction,
  trackSearchImpressionsAction,
} from '@/lib/analytics/analytics-service';

// Endpoint para sendBeacon/fetch keepalive: sobrevive à troca de página (Server Actions não sobrevivem).
// Reaproveita a mesma gravação e validações de trackDirectoryEventAction.

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CYCLE_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // sendBeacon ou requisições mobile nativas sem Origin
  try {
    const originUrl = new URL(origin);
    const host = request.headers.get('host');
    if (originUrl.host === host) return true;

    // Suporte explícito a Capacitor / Aplicativo Móvel Conexão Maçônica
    if (
      originUrl.protocol === 'capacitor:' ||
      originUrl.protocol === 'ionic:' ||
      (originUrl.hostname === 'localhost' && (originUrl.protocol === 'http:' || originUrl.protocol === 'https:'))
    ) {
      return true;
    }

    // Suporte a domínios do ecossistema Conexão Maçônica
    if (originUrl.hostname.endsWith('conexaomaconica.com.br')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Platform',
    'Access-Control-Max-Age': '86400',
  };
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

export async function OPTIONS(request: Request) {
  if (!isAllowedOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  if (!isAllowedOrigin(request)) return NextResponse.json({ ok: false }, { status: 403, headers: corsHeaders });

  // Descarta silenciosamente pré-carregamento do navegador e robôs conhecidos sem gravar no banco
  if (isPrefetch(request) || isBot(request.headers.get('user-agent'))) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200, headers: corsHeaders });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 2000) return NextResponse.json({ ok: false }, { status: 413, headers: corsHeaders });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }

  const {
    businessId,
    businessIds,
    eventType,
    source,
    origin,
    acquisitionSource,
    discoverySource,
    cycleId,
    city,
    state,
    device,
  } = (body ?? {}) as {
    businessId?: unknown;
    businessIds?: unknown;
    eventType?: unknown;
    source?: unknown;
    origin?: unknown;
    acquisitionSource?: unknown;
    discoverySource?: unknown;
    cycleId?: unknown;
    city?: unknown;
    state?: unknown;
    device?: unknown;
  };

  // Aparições na busca chegam em lote (até 50 empresas).
  if (eventType === 'search_impression') {
    const ids = Array.isArray(businessIds) ? businessIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)).slice(0, 50) : [];
    if (ids.length === 0) return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
    const result = await trackSearchImpressionsAction(ids, typeof source === 'string' ? source.slice(0, 60) : 'directory_list');
    return NextResponse.json({ ok: Boolean((result as { ok?: boolean }).ok) }, { status: 200, headers: corsHeaders });
  }

  if (typeof businessId !== 'string' || !UUID.test(businessId)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }

  // Normalização segura de vocabulário canônico (unifica web e mobile)
  const normalizedType = normalizeAnalyticsEventType(eventType);
  if (!normalizedType) {
    return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
  }

  // Sanitização estrita do identificador de ciclo
  let sanitizedCycleId: string | undefined = undefined;
  if (typeof cycleId === 'string') {
    const trimmedCycle = cycleId.trim();
    if (trimmedCycle.length > 0) {
      if (!CYCLE_REGEX.test(trimmedCycle)) {
        if (normalizedType === 'view') {
          return NextResponse.json({ ok: false, error: 'INVALID_CYCLE_ID' }, { status: 400, headers: corsHeaders });
        }
      } else {
        sanitizedCycleId = trimmedCycle;
      }
    }
  }

  const clientPlatform = request.headers.get('x-client-platform');
  const resolvedDevice =
    typeof device === 'string' && device.length > 0
      ? device.slice(0, 30)
      : clientPlatform === 'mobile_app'
        ? 'mobile_app'
        : 'web';

  const resolvedAcquisition = normalizeAcquisitionSource(acquisitionSource || origin);
  const resolvedDiscovery = normalizeDiscoverySource(discoverySource || source);

  const result = await trackDirectoryEventAction({
    businessId,
    eventType: normalizedType,
    source: typeof source === 'string' && source.length > 0 ? source.slice(0, 60) : resolvedDiscovery,
    acquisitionSource: resolvedAcquisition,
    discoverySource: resolvedDiscovery,
    origin: isVisitOrigin(origin) ? origin : resolvedAcquisition,
    cycleId: sanitizedCycleId,
    city: typeof city === 'string' ? city.slice(0, 100) : undefined,
    state: typeof state === 'string' ? state.slice(0, 10) : undefined,
    device: resolvedDevice,
  });

  // Telemetria nunca devolve erro detalhado ao navegador.
  return NextResponse.json({ ok: Boolean((result as { ok?: boolean }).ok) }, { status: 200, headers: corsHeaders });
}
