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
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return mobileJsonResponse({ success: false, error: 'Payload inválido.' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !email.includes('@')) {
    return mobileJsonResponse({ success: false, error: 'Informe um e-mail válido.' }, 400);
  }
  if (!password) {
    return mobileJsonResponse({ success: false, error: 'Informe sua senha.' }, 400);
  }

  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível no momento.' }, 503);
  }

  const { data, error } = await clients.anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    const msgLower = (error?.message || '').toLowerCase();
    if (msgLower.includes('email not confirmed')) {
      return mobileJsonResponse(
        { success: false, error: 'Confirme seu e-mail através do link enviado para acessar sua conta.' },
        401
      );
    }
    return mobileJsonResponse({ success: false, error: 'E-mail ou senha incorretos.' }, 401);
  }

  const dbReader = (clients.adminClient || clients.anonClient) as any;
  const { data: profile } = await dbReader
    .from('profiles')
    .select('name, phone, city, state, avatar_url, role, status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.status === 'deleted') {
    await clients.anonClient.auth.signOut().catch(() => null);
    return mobileJsonResponse(
      { success: false, error: 'Esta conta foi excluída permanentemente e não pode mais ser acessada.' },
      401
    );
  }

  const meta = data.user.user_metadata || {};
  const fallbackName =
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    email.split('@')[0] ||
    'Membro';

  return mobileJsonResponse({
    success: true,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    },
    user: {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.name || fallbackName,
      phone: profile?.phone || '',
      city: profile?.city || (typeof meta.city === 'string' ? meta.city : '') || '',
      state: profile?.state || (typeof meta.state === 'string' ? meta.state : '') || '',
      avatarUrl: profile?.avatar_url || null,
      role: profile?.role || 'member',
    },
  });
}

