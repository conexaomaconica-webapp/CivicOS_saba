import { describe, expect, it } from 'vitest';
import { createSecureSessionStore, SESSION_KEY, type SecureVault } from './secure-session-store';
import type { MobileSession } from './mobile-auth';

const session: MobileSession = { accessToken: 'a', refreshToken: 'r', expiresAt: 123, userId: 'u1' };

describe('secure session store', () => {
  it('serializes only through the native vault contract and clears locally', async () => {
    const values = new Map<string, string>();
    const vault: SecureVault = {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value); },
      remove: async (key) => { values.delete(key); },
    };
    const store = createSecureSessionStore(vault);
    await store.write(session);
    expect(await store.read()).toEqual(session);
    expect(values.has(SESSION_KEY)).toBe(true);
    await store.clear();
    expect(await store.read()).toBeNull();
  });

  it('rejects malformed or incomplete persisted values', async () => {
    const vault: SecureVault = { get: async () => '{"accessToken":"only"}', set: async () => undefined, remove: async () => undefined };
    expect(await createSecureSessionStore(vault).read()).toBeNull();
  });
});

