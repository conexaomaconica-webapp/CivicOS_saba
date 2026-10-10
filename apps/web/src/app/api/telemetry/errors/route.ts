import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';
import { sanitizeData, sanitizeString } from '@/lib/observability/redaction';

export const dynamic = 'force-dynamic';

// Limites rígidos de proteção do endpoint
const MAX_PAYLOAD_BYTES = 2048; // 2 KB
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REPORTS_PER_WINDOW = 20; // 20 erros por IP por minuto

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const clientErrorDedupMap = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutos de deduplicação

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REPORTS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(req: Request) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 1. Proteção contra abuso de chamadas (Rate Limiting)
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  // 2. Proteção contra payloads excessivos (Payload Too Large)
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE: Tamanho excede o limite máximo permitido.' },
      { status: 413, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE' },
      { status: 413, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBodyText || '{}') as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD_STRUCTURE' }, { status: 400 });
  }

  // 3. Extração e validação de campos estritos (rejeita stack traces arbitrários e dados extensos)
  const rawDigest = typeof payload.digest === 'string' ? payload.digest.trim().slice(0, 64) : undefined;
  const rawMessage = typeof payload.message === 'string' ? payload.message.trim().slice(0, 200) : 'Erro no cliente';
  const rawPathname =
    typeof payload.pathname === 'string'
      ? (payload.pathname.trim().split('?')[0] || '/').slice(0, 100)
      : '/';
  const componentSource = typeof payload.source === 'string' ? payload.source.trim().slice(0, 50) : 'error-boundary';

  // 4. Sanitização no servidor contra credenciais ou dados pessoais vazados
  const sanitizedMessage = sanitizeString(rawMessage);
  const sanitizedDigest = rawDigest ? sanitizeString(rawDigest) : undefined;
  const sanitizedPathname = sanitizeString(rawPathname);

  // 5. Deduplicação em memória para suprimir rajadas de erros idênticos de render
  const dedupKey = `${sanitizedPathname}:${sanitizedMessage.slice(0, 60)}`;
  const now = Date.now();
  const lastLogged = clientErrorDedupMap.get(dedupKey);

  if (lastLogged && now - lastLogged < DEDUP_WINDOW_MS) {
    return NextResponse.json(
      { received: true, deduplicated: true },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }

  clientErrorDedupMap.set(dedupKey, now);

  // 6. Registro estruturado JSON indexável no Vercel Function Logs
  const incidentId = logger.error(`[Telemetria Web] ${sanitizedMessage}`, {
    source: componentSource,
    route: sanitizedPathname,
    digest: sanitizedDigest,
    sanitized_context: sanitizeData(payload.extra),
  });

  return NextResponse.json(
    { received: true, incident_id: incidentId },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
