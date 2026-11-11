import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export const MOBILE_API_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Client-Platform',
};

export function mobileCorsOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: MOBILE_API_CORS_HEADERS });
}

export function mobileJsonResponse<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...MOBILE_API_CORS_HEADERS,
    },
  });
}

export function resolveMobileHost(): string {
  const configured = process.env.MOBILE_CANONICAL_HOST?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'localhost:3000';
  return 'conexaomaconica.com.br';
}

export function createMobileSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const adminClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

  return { supabaseUrl, supabaseAnonKey, anonClient, adminClient };
}

export interface MobileAuthContext {
  user: User;
  accessToken: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient | null;
  host: string;
}

export async function authenticateMobileRequest(
  request: Request
): Promise<{ ok: true; ctx: MobileAuthContext } | { ok: false; status: number; error: string }> {
  const clients = createMobileSupabaseClients();
  if (!clients) {
    return { ok: false, status: 503, error: 'Serviço de autenticação não configurado.' };
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return { ok: false, status: 401, error: 'Sessão não autenticada. Faça login novamente.' };
  }

  const { data, error } = await clients.anonClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Sessão expirada ou inválida. Faça login novamente.' };
  }

  const userClient = createClient(clients.supabaseUrl, clients.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Defensive check: ensure soft-deleted profiles cannot operate
  const profileReader = (clients.adminClient || userClient) as any;
  const { data: profileRow } = await profileReader
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileRow?.status === 'deleted') {
    return { ok: false, status: 401, error: 'Esta conta foi excluída e não possui mais acesso.' };
  }

  return {
    ok: true,
    ctx: {
      user: data.user,
      accessToken: token,
      userClient,
      adminClient: clients.adminClient,
      host: resolveMobileHost(),
    },
  };
}

export async function resolveMobileTenantId(db: SupabaseClient): Promise<string | null> {
  try {
    const admin = db as any;
    const { data } = await admin
      .from('tenants')
      .select('id')
      .or('slug.eq.conexaomaconica,custom_domain.eq.conexaomaconica.com.br')
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

