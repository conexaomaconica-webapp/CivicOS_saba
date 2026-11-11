import {
  createMobileSupabaseClients,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
  if (!refreshToken) {
    return mobileJsonResponse({ success: false, error: 'Refresh token ausente.' }, 400);
  }

  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível.' }, 503);
  }

  const { data, error } = await clients.anonClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    return mobileJsonResponse({ success: false, error: 'Sessão expirada. Entre novamente.' }, 401);
  }

  return mobileJsonResponse({
    success: true,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    },
    userId: data.user.id,
  });
}

