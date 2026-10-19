import { describe, expect, it, vi } from 'vitest';
import { MOBILE_TENANT_SLUG } from './member-access';
import { MobileAuthController, parseAuthCallback, type MobileAuthProvider, type MobileSession, type SecureSessionStore } from './mobile-auth';

const session: MobileSession = { accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000, userId: 'user-1' };
function harness(tenantSlug: string = MOBILE_TENANT_SLUG) {
  const provider: MobileAuthProvider = {
    signInWithPassword: vi.fn(async () => session),
    refreshSession: vi.fn(async () => session),
    signOut: vi.fn(async () => undefined),
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => () => undefined),
  };
  let stored: MobileSession | null = null;
  const store: SecureSessionStore = {
    read: vi.fn(async () => stored),
    write: vi.fn(async (value) => { stored = value; }),
    clear: vi.fn(async () => { stored = null; }),
  };
  const controller = new MobileAuthController(provider, store, async () => ({
    authenticated: true, tenantSlug, membershipActive: true, profileStatus: 'active', role: 'member',
  }));
  return { provider, store, controller };
}

describe('mobile auth foundation', () => {
  it('parses PKCE callback and rejects malformed URLs', () => {
    expect(parseAuthCallback('conexao://auth/callback?code=abc')).toEqual({ code: 'abc' });
    expect(parseAuthCallback('conexao://auth/callback?error=access_denied')).toEqual({ error: 'access_denied' });
    expect(parseAuthCallback('not a url')).toEqual({ error: 'invalid-auth-callback' });
  });

  it('persists an authenticated session only after backend member authorization', async () => {
    const { controller, store } = harness();
    expect((await controller.signIn('membro@example.test', 'password')).status).toBe('signed-in');
    expect(store.write).toHaveBeenCalledWith(session);
  });

  it('fails closed for a session belonging to another tenant', async () => {
    const { controller, store } = harness('other-tenant');
    const state = await controller.signIn('membro@example.test', 'password');
    expect(state).toEqual({ status: 'error', message: 'mobile-access-denied:tenant-mismatch' });
    expect(store.write).toHaveBeenCalledWith(session);
    expect(store.clear).toHaveBeenCalled();
  });

  it('clears the secure store on logout', async () => {
    const { controller, store } = harness();
    await controller.signOut();
    expect(store.clear).toHaveBeenCalled();
  });

  it('keeps the session indeterminate when backend authorization is unavailable', async () => {
    const { provider, store } = harness();
    const controller = new MobileAuthController(provider, store, async () => {
      throw new Error('network-unavailable');
    });
    expect(await controller.signIn('membro@example.test', 'password')).toEqual({
      status: 'indeterminate',
      message: 'network-unavailable',
    });
    expect(store.write).toHaveBeenCalledWith(session);
    expect(store.clear).not.toHaveBeenCalled();
  });
});
