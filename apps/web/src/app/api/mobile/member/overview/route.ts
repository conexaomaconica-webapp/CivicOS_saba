import {
  authenticateMobileRequest,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth.ok) {
    return mobileJsonResponse({ success: false, error: auth.error }, auth.status);
  }

  const { user, userClient, adminClient, host } = auth.ctx;
  const db = userClient as any;
  const reader = (adminClient || userClient) as any;

  const [profileRes, favRes, benefitsRes, redemptionsRes, referralRes] = await Promise.all([
    reader
      .from('profiles')
      .select('name, email, phone, city, state, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle()
      .then((r: any) => r, () => ({ data: null })),
    db
      .rpc('my_favorite_slugs', { p_host: host })
      .then((r: any) => r, () => ({ data: [] })),
    db
      .from('business_benefit_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then((r: any) => r, () => ({ count: 0 })),
    db
      .from('business_benefit_redemptions')
      .select('id, public_code, status, redeemed_at, benefit_snapshot')
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false })
      .limit(50)
      .then((r: any) => r, () => ({ data: [] })),
    db
      .rpc('my_referral_summary')
      .then((r: any) => r, () => ({ data: null })),
  ]);

  const profile = profileRes?.data || null;
  const meta = user.user_metadata || {};
  const favoriteSlugs: string[] = Array.isArray(favRes?.data) ? favRes.data : [];
  const referralSummary = referralRes?.data || null;
  const redemptions = Array.isArray(redemptionsRes?.data) ? redemptionsRes.data : [];

  return mobileJsonResponse({
    success: true,
    user: {
      id: user.id,
      email: user.email || profile?.email || '',
      name: profile?.name || (typeof meta.name === 'string' ? meta.name : '') || 'Membro',
      phone: profile?.phone || '',
      city: profile?.city || (typeof meta.city === 'string' ? meta.city : '') || '',
      state: profile?.state || (typeof meta.state === 'string' ? meta.state : '') || '',
      avatarUrl: profile?.avatar_url || null,
      role: profile?.role || 'member',
    },
    stats: {
      favoritesCount: favoriteSlugs.length,
      benefitsCount: benefitsRes?.count ?? redemptions.length,
      referralsCount: referralSummary?.total ?? 0,
      confirmedConnectionsCount: referralSummary?.connections ?? 0,
    },
    favoriteSlugs,
    redemptions,
    referralsSummary: referralSummary,
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth.ok) {
    return mobileJsonResponse({ success: false, error: auth.error }, auth.status);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return mobileJsonResponse({ success: false, error: 'JSON inválido.' }, 400);
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const state = typeof body?.state === 'string' ? body.state.trim().toUpperCase() : '';

  if (name.length < 3 || name.length > 180) {
    return mobileJsonResponse({ success: false, error: 'Informe um nome completo válido (mín. 3 caracteres).' }, 400);
  }
  if (city.length < 2 || city.length > 120) {
    return mobileJsonResponse({ success: false, error: 'Informe uma cidade válida.' }, 400);
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    return mobileJsonResponse({ success: false, error: 'Informe a UF com duas letras (ex: BA).' }, 400);
  }
  if (phone && phone.replace(/\D/g, '').length < 10) {
    return mobileJsonResponse({ success: false, error: 'Telefone inválido. Informe DDD + número.' }, 400);
  }

  const { user, userClient, adminClient } = auth.ctx;
  const writer = (adminClient || userClient) as any;

  const { error: updateErr } = await writer
    .from('profiles')
    .update({
      name,
      phone: phone || null,
      city,
      state,
    })
    .eq('id', user.id);

  if (updateErr) {
    return mobileJsonResponse({ success: false, error: 'Não foi possível atualizar seu perfil agora.' }, 400);
  }

  if (adminClient) {
    await adminClient.auth.admin
      .updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          name,
          city,
          state,
        },
      })
      .catch(() => null);
  }

  return mobileJsonResponse({
    success: true,
    user: {
      id: user.id,
      email: user.email || '',
      name,
      phone,
      city,
      state,
    },
  });
}

