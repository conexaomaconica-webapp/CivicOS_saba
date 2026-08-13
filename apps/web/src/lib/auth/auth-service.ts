import type { AuthError, Session, User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export interface SignInResult extends AuthResult {
  error: AuthError | null;
}

export interface SignUpResult extends AuthResult {
  error: AuthError | null;
}

export interface ResetResult {
  error: AuthError | null;
}

export type ProfilePatch = {
  name?: string;
  email?: string;
};

export interface ProfileUpdateResult {
  ok: boolean;
  error: string | null;
  emailConfirmationRequired?: boolean;
}

/**
 * CRIT-TRN-001 — every authenticated request must carry the JWT via
 * `Authorization: Bearer <token>`. Builds the header from the current session.
 */
export function getAuthHeaders(session: Session | null): Record<string, string> {
  if (!session?.access_token) {
    return {};
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function signIn(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signUp(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
  metadata?: Record<string, unknown>,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * CRIT-TRN-003 — logout revokes the local tokens and clears the app session.
 */
export async function signOut(supabase: SupabaseClient<Database>): Promise<AuthError | null> {
  const { error } = await supabase.auth.signOut();
  return error;
}

/**
 * PUB-013 — requests a password-recovery e-mail. The link points to
 * `/auth/callback` which exchanges the code and forwards to the password form.
 */
export async function sendPasswordResetEmail(
  supabase: SupabaseClient<Database>,
  email: string,
  redirectTo: string,
): Promise<ResetResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

/**
 * PUB-013 — exchanges a recovery/confirmation `code` for a session.
 */
export async function exchangeCodeForSession(
  supabase: SupabaseClient<Database>,
  code: string,
): Promise<AuthResult & { error: AuthError | null }> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * PUB-013 — updates the password for the current (recovery) session.
 */
export async function updatePassword(
  supabase: SupabaseClient<Database>,
  password: string,
): Promise<AuthResult & { error: AuthError | null }> {
  const { data, error } = await supabase.auth.updateUser({ password });
  return {
    user: data.user,
    session: null,
    error,
  };
}

/**
 * CRIT-TRN-002 — returns the current session, silently refreshed by
 * @supabase/ssr on the browser when the access token has expired.
 */
export async function getSession(supabase: SupabaseClient<Database>): Promise<AuthResult> {
  const { data } = await supabase.auth.getSession();
  return {
    user: data.session?.user ?? null,
    session: data.session ?? null,
  };
}

/**
 * USR-001 — updates the user's own profile (name + e-mail). Forwards the patch
 * to both Auth (raw_user_meta_data) and the `profiles` table. An e-mail change
 * requires confirmation, so the caller is told via `emailConfirmationRequired`.
 */
export async function updatePersonalProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: ProfilePatch,
): Promise<ProfileUpdateResult> {
  const profileUpdate: { name?: string; email?: string } = {};
  const authUpdate: { email?: string; data?: Record<string, unknown> } = {};

  if (patch.name !== undefined) {
    profileUpdate.name = patch.name;
    authUpdate.data = { ...(authUpdate.data ?? {}), name: patch.name };
  }
  if (patch.email !== undefined) {
    profileUpdate.email = patch.email;
    authUpdate.email = patch.email;
  }

  if (authUpdate.email !== undefined || authUpdate.data !== undefined) {
    const { error } = await supabase.auth.updateUser(authUpdate);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId);
  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  return {
    ok: true,
    error: null,
    emailConfirmationRequired: patch.email !== undefined,
  };
}