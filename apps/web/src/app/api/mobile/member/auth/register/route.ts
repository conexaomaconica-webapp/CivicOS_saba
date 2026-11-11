import {
  validateRegistration,
  hasErrors,
  type RegistrationFields,
} from '@/lib/auth/validation';
import {
  createMobileSupabaseClients,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
  resolveMobileTenantId,
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

  const fields: RegistrationFields = {
    name: typeof body.name === 'string' ? body.name : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    password: typeof body.password === 'string' ? body.password : '',
    confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : '',
    city: typeof body.city === 'string' ? body.city.trim() : '',
    state: typeof body.state === 'string' ? body.state.trim().toUpperCase() : '',
    acceptedTerms: Boolean(body.acceptedTerms),
    acceptedPrivacy: Boolean(body.acceptedPrivacy),
  };

  const validationErrors = validateRegistration(fields);
  if (hasErrors(validationErrors)) {
    const firstError =
      validationErrors.name ||
      validationErrors.email ||
      validationErrors.city ||
      validationErrors.state ||
      validationErrors.password ||
      validationErrors.confirmPassword ||
      validationErrors.acceptedTerms ||
      validationErrors.acceptedPrivacy ||
      'Verifique os campos do cadastro.';
    return mobileJsonResponse(
      { success: false, error: firstError, fieldErrors: validationErrors },
      400
    );
  }

  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível no momento.' }, 503);
  }

  const tenantId = await resolveMobileTenantId(clients.adminClient || clients.anonClient);
  const nowIso = new Date().toISOString();

  const { data, error } = await clients.anonClient.auth.signUp({
    email: fields.email,
    password: fields.password,
    options: {
      data: {
        name: fields.name.trim(),
        city: fields.city,
        state: fields.state,
        terms_accepted_at: nowIso,
        privacy_accepted_at: nowIso,
        tenant_id: tenantId,
      },
    },
  });

  if (error) {
    const msgLower = error.message.toLowerCase();
    if (msgLower.includes('already registered') || msgLower.includes('user already exists')) {
      return mobileJsonResponse(
        { success: false, error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.' },
        409
      );
    }
    return mobileJsonResponse({ success: false, error: error.message }, 400);
  }

  // Supabase returns empty identities when user already exists with email confirmation enabled
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return mobileJsonResponse(
      { success: false, error: 'Este e-mail já possui cadastro. Faça login ou recupere sua senha.' },
      409
    );
  }

  // Ensure profile fields (name/city/state/role) are populated immediately if adminClient is available
  if (data.user?.id && clients.adminClient) {
    try {
      await (clients.adminClient as any)
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            email: fields.email,
            name: fields.name.trim(),
            city: fields.city,
            state: fields.state,
            status: 'active',
          },
          { onConflict: 'id' }
        );
    } catch {
      // Trigger on auth.users may handle this automatically; ignore non-fatal upsert
    }
  }

  const sessionPayload = data.session
    ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      }
    : null;

  return mobileJsonResponse({
    success: true,
    needsEmailConfirmation: !sessionPayload,
    message: sessionPayload
      ? 'Conta criada com sucesso!'
      : 'Cadastro realizado! Verifique sua caixa de entrada para confirmar seu e-mail antes de entrar.',
    session: sessionPayload,
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email || fields.email,
          name: fields.name.trim(),
          city: fields.city,
          state: fields.state,
          phone: '',
        }
      : null,
  });
}

