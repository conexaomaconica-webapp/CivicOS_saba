import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Rate limiting simples em memória: máximo de 30 consultas por minuto
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET;

  // Se secret estiver configurado, exige validação estrita
  if (secret && secret.trim().length > 0) {
    const authHeader = req.headers.get('authorization');
    const customHeader = req.headers.get('x-health-key');

    const bearerMatch = authHeader?.startsWith('Bearer ') && authHeader.slice(7).trim() === secret;
    const customMatch = customHeader?.trim() === secret;

    return Boolean(bearerMatch || customMatch);
  }

  // Em desenvolvimento, permite se o secret não tiver sido definido
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Em produção sem secret configurado, bloqueia por padrão para proteger o endpoint
  return false;
}

export async function GET(req: Request) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'internal';

  // 1. Verificação de Autorização
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED: Acesso restrito à verificação de prontidão.' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  // 2. Proteção contra requisições abusivas (Rate Limiting)
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'TOO_MANY_REQUESTS: Limite de consultas de prontidão excedido.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  // 3. Verificação do Supabase com credenciais mínimas e timeout estrito (2.5 segundos)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        status: 'degraded',
        web: 'healthy',
        database: 'unconfigured',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: controller.signal }) },
    });

    // Consulta de leitura mínima (tabela canônica de empresas)
    const { error } = await supabase
      .from('businesses')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    clearTimeout(timeoutId);

    if (error && !error.message.includes('0 rows')) {
      return NextResponse.json(
        {
          status: 'degraded',
          web: 'healthy',
          database: 'unhealthy',
          error_code: 'DATABASE_QUERY_ERROR',
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: 'ready',
        web: 'healthy',
        database: 'healthy',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json(
      {
        status: 'degraded',
        web: 'healthy',
        database: 'unhealthy',
        error_code: 'DATABASE_TIMEOUT_OR_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }
}
