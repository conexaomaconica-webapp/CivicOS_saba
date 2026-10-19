import type { MobileSession } from './mobile-auth';

/** Native vault contract. Android must back this with Keystore; iOS with Keychain. */
export interface SecureVault {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const SESSION_KEY = 'mobile.auth.session.v1';

export function createSecureSessionStore(vault: SecureVault) {
  return {
    async read(): Promise<MobileSession | null> {
      const raw = await vault.get(SESSION_KEY);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw) as Partial<MobileSession>;
        if (typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string' || typeof value.userId !== 'string' || typeof value.expiresAt !== 'number') return null;
        return value as MobileSession;
      } catch {
        return null;
      }
    },
    async write(session: MobileSession): Promise<void> {
      await vault.set(SESSION_KEY, JSON.stringify(session));
    },
    clear(): Promise<void> {
      return vault.remove(SESSION_KEY);
    },
  };
}

export { SESSION_KEY };

