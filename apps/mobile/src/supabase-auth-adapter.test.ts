import { describe, expect, it, vi } from 'vitest';
import { createSupabaseMobileAuthProvider } from './supabase-auth-adapter';

const rawSession = { access_token: 'a', refresh_token: 'r', expires_at: 123, user: { id: 'u1' } };

function client() {
  const unsubscribe = vi.fn();
  return {
    unsubscribe,
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { session: rawSession }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: rawSession }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: rawSession }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn((_callback: (event: string, session: typeof rawSession) => void) => ({ data: { subscription: { unsubscribe } } })),
    },
  };
}

describe('Supabase mobile auth adapter', () => {
  it('maps Supabase sessions and uses local logout scope', async () => {
    const supabase = client();
    const provider = createSupabaseMobileAuthProvider(supabase);
    expect(await provider.signInWithPassword('m@example.test', 'secret')).toMatchObject({ userId: 'u1', accessToken: 'a' });
    await provider.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('maps refresh and current session', async () => {
    const provider = createSupabaseMobileAuthProvider(client());
    expect((await provider.refreshSession()).refreshToken).toBe('r');
    expect((await provider.getSession())?.userId).toBe('u1');
  });
});
