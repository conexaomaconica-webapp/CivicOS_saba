'use server';

import { getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { sendSignupConfirmationEmail } from '@/lib/auth/signup-confirmation-email';
import { hasErrors, validateRegistration, type RegistrationErrors, type RegistrationFields } from '@/lib/auth/validation';
import { checkRateLimit, getClientIpAddress } from '@/lib/security/rate-limiter';
import { createServerSideClient } from '@/lib/supabase/server';

export type RegisterMemberActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: RegistrationErrors };

/**
 * Cadastro público na Web.
 * Usa `sendSignupConfirmationEmail` (mesmo fluxo do app mobile) para enviar a confirmação
 * com a identidade visual da Conexão Maçônica, recorrendo ao Supabase Auth padrão apenas se
 * o envio próprio não estiver configurado.
 */
export async function registerMemberAction(
  rawFields: RegistrationFields,
  tenantId: string | null = null,
): Promise<RegisterMemberActionResult> {
  const fields: RegistrationFields = {
    name: typeof rawFields?.name === 'string' ? rawFields.name.trim() : '',
    email: typeof rawFields?.email === 'string' ? rawFields.email.trim().toLowerCase() : '',
    password: typeof rawFields?.password === 'string' ? rawFields.password : '',
    confirmPassword: typeof rawFields?.confirmPassword === 'string' ? rawFields.confirmPassword : '',
    city: typeof rawFields?.city === 'string' ? rawFields.city.trim() : '',
    state: typeof rawFields?.state === 'string' ? rawFields.state.trim().toUpperCase() : '',
    acceptedTerms: Boolean(rawFields?.acceptedTerms),
    acceptedPrivacy: Boolean(rawFields?.acceptedPrivacy),
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
    return { success: false, error: firstError, fieldErrors: validationErrors };
  }

  const byIp = await checkRateLimit('auth', await getClientIpAddress());
  if (!byIp.allowed) {
    return { success: false, error: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' };
  }

  const nowIso = new Date().toISOString();
  const userMetadata: Record<string, unknown> = {
    name: fields.name,
    city: fields.city,
    state: fields.state,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    tenant_id: tenantId,
  };

  const ownSignup = await sendSignupConfirmationEmail(fields.email, fields.password, userMetadata);
  const admin = getAccountAdminClient();

  if (ownSignup.ok) {
    if (ownSignup.userId && admin) {
      try {
        await (admin as unknown as {
          from: (table: string) => {
            upsert: (values: Record<string, unknown>, options: { onConflict: string }) => Promise<unknown>;
          };
        })
          .from('profiles')
          .upsert(
            {
              id: ownSignup.userId,
              email: fields.email,
              name: fields.name,
              city: fields.city,
              state: fields.state,
              status: 'active',
            },
            { onConflict: 'id' },
          );
      } catch {
        // Trigger em auth.users faz o preenchimento padrão caso o upsert falhe.
      }
    }
    return { success: true };
  }

  if (ownSignup.reason === 'already_exists') {
    return { success: false, error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.' };
  }

  if (ownSignup.reason !== 'not_configured') {
    return {
      success: false,
      error: ownSignup.errorMessage || 'Não foi possível enviar o e-mail de confirmação agora. Tente novamente.',
    };
  }

  // Fallback apenas quando o provedor próprio / admin key não está configurado no ambiente.
  const supabase = await createServerSideClient();
  const { data, error } = await supabase.auth.signUp({
    email: fields.email,
    password: fields.password,
    options: { data: userMetadata },
  });

  if (error) {
    const msgLower = error.message.toLowerCase();
    if (msgLower.includes('already registered') || msgLower.includes('user already exists')) {
      return { success: false, error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.' };
    }
    return { success: false, error: error.message };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { success: false, error: 'Este e-mail já possui cadastro. Faça login ou recupere sua senha.' };
  }

  return { success: true };
}

