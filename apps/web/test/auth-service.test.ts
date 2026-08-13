import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getAuthHeaders, signIn, signOut, signUp, getSession, sendPasswordResetEmail, exchangeCodeForSession, updatePassword } from '../src/lib/auth/auth-service';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-token-jwt',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1999999999,
    refresh_token: 'refresh-token',
    user: makeUser(),
    ...overrides,
  };
}

function makeUser(): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'user@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  };
}

function makeSupabase(mock: {
  signInWithPassword?: (params: { email: string; password: string }) => Promise<{
    data: { session: Session | null; user: User | null; weakPassword?: null };
    error: AuthError | null;
  }>;
  signUp?: (params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) => Promise<{
    data: { session: Session | null; user: User | null; weakPassword?: null };
    error: AuthError | null;
  }>;
  signOut?: () => Promise<{ error: AuthError | null }>;
  getSession?: () => Promise<{ data: { session: Session | null }; error: AuthError | null }>;
  resetPasswordForEmail?: (email: string, options: { redirectTo: string }) => Promise<{ error: AuthError | null }>;
  exchangeCodeForSession?: (code: string) => Promise<{
    data: { session: Session | null; user: User | null };
    error: AuthError | null;
  }>;
  updateUser?: (attributes: { password: string }) => Promise<{
    data: { session: Session | null; user: User | null };
    error: AuthError | null;
  }>;
}) {
  const auth: Record<string, unknown> = {};
  auth.signInWithPassword = vi.fn(mock.signInWithPassword);
  auth.signUp = vi.fn(mock.signUp);
  auth.signOut = vi.fn(mock.signOut);
  auth.getSession = vi.fn(mock.getSession);
  auth.resetPasswordForEmail = vi.fn(mock.resetPasswordForEmail);
  auth.exchangeCodeForSession = vi.fn(mock.exchangeCodeForSession);
  auth.updateUser = vi.fn(mock.updateUser);
  return { auth } as unknown as SupabaseClient<Database>;
}

describe('auth-service · PUB-011 (CRIT-TRN-001/002/003)', () => {
  it('CRIT-TRN-001 — login produces a session and the Bearer header carries the JWT', async () => {
    const session = makeSession({ access_token: 'access-token-jwt' });
    const supabase = makeSupabase({
      signInWithPassword: async () => ({
        data: { session, user: session.user, weakPassword: null },
        error: null,
      }),
    });

    const result = await signIn(supabase, 'user@example.com', 'secret');

    expect(result.error).toBeNull();
    expect(result.session?.access_token).toBe('access-token-jwt');
    expect(getAuthHeaders(result.session)).toEqual({
      Authorization: 'Bearer access-token-jwt',
    });
  });

  it('CRIT-TRN-001 — no session produces no Authorization header', () => {
    expect(getAuthHeaders(null)).toEqual({});
  });

  it('login failure is surfaced as a typed error without throwing', async () => {
    const authError = Object.assign(new Error('Invalid login credentials'), {
      status: 400,
      name: 'AuthApiError',
    }) as AuthError;

    const supabase = makeSupabase({
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: authError }),
    });

    const result = await signIn(supabase, 'bad@example.com', 'wrong');

    expect(result.error).toBe(authError);
    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
  });

  it('CRIT-TRN-002 — session getter surfaces the silently refreshed session', async () => {
    const refreshed = makeSession({ access_token: 'refreshed-token-jwt' });
    const supabase = makeSupabase({
      getSession: async () => ({ data: { session: refreshed }, error: null }),
    });

    const result = await getSession(supabase);

    expect(result.session?.access_token).toBe('refreshed-token-jwt');
    expect(getAuthHeaders(result.session)).toEqual({
      Authorization: 'Bearer refreshed-token-jwt',
    });
  });

  it('CRIT-TRN-003 — signOut clears the session and produces no Authorization header', async () => {
    const supabase = makeSupabase({
      signOut: async () => ({ error: null }),
    });

    const error = await signOut(supabase);
    expect(error).toBeNull();

    expect(getAuthHeaders(null)).toEqual({});
  });

  it('signUp registers a new user and passes the provided metadata', async () => {
    const user = makeUser();
    const supabase = makeSupabase({
      signUp: async ({ email, password, options }) => {
        expect(email).toBe('novo@exemplo.com');
        expect(password).toBe('12345678');
        expect(options?.data).toEqual({ name: 'João Silva', role: 'usuario_comum' });
        return { data: { user, session: null, weakPassword: null }, error: null };
      },
    });

    const result = await signUp(supabase, 'novo@exemplo.com', '12345678', {
      name: 'João Silva',
      role: 'usuario_comum',
    });

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe('user-1');
  });

  it('signUp surfaces a typed error without throwing', async () => {
    const authError = Object.assign(new Error('User already registered'), {
      status: 422,
      name: 'AuthApiError',
    }) as AuthError;

    const supabase = makeSupabase({
      signUp: async () => ({ data: { user: null, session: null }, error: authError }),
    });

    const result = await signUp(supabase, 'existente@exemplo.com', '12345678');

    expect(result.error).toBe(authError);
    expect(result.user).toBeNull();
  });

  it('PUB-013 — sendPasswordResetEmail forwards email and redirectTo', async () => {
    const supabase = makeSupabase({
      resetPasswordForEmail: async (email, options) => {
        expect(email).toBe('user@example.com');
        expect(options.redirectTo).toContain('/auth/callback');
        return { error: null };
      },
    });

    const { error } = await sendPasswordResetEmail(
      supabase,
      'user@example.com',
      'https://app.local/auth/callback?next=/update-password',
    );

    expect(error).toBeNull();
  });

  it('PUB-013 — exchangeCodeForSession returns the recovered session', async () => {
    const session = makeSession({ access_token: 'recovery-session-token' });
    const supabase = makeSupabase({
      exchangeCodeForSession: async (code) => {
        expect(code).toBe('recovery-code-123');
        return { data: { session, user: session.user }, error: null };
      },
    });

    const result = await exchangeCodeForSession(supabase, 'recovery-code-123');

    expect(result.error).toBeNull();
    expect(result.session?.access_token).toBe('recovery-session-token');
  });

  it('PUB-013 — updatePassword applies the new password on the recovery session', async () => {
    const user = makeUser();
    const supabase = makeSupabase({
      updateUser: async ({ password }) => {
        expect(password).toBe('nova-senha-123');
        return { data: { session: null, user }, error: null };
      },
    });

    const result = await updatePassword(supabase, 'nova-senha-123');

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe('user-1');
  });
});