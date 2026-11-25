import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BIOMETRIC_META_STORAGE_KEY,
  clearBiometricAuthState,
  disableBiometricAuth,
  enableBiometricAuth,
  getBiometricAvailability,
  hasBiometricProtectedSession,
  syncRotatedRefreshTokenIfBiometricEnabled,
  unlockSessionWithBiometry,
  type BiometricKeychainNativeBridge,
} from './biometric-auth';
import {
  MOBILE_SESSION_STORAGE_KEY,
  readStoredMobileSession,
  writeStoredMobileSession,
} from './mobile-member-client';

function createMemoryLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function createFakeKeychainBridge(): BiometricKeychainNativeBridge & {
  saved: { token: string; account: string } | null;
} {
  const state: { saved: { token: string; account: string } | null } = { saved: null };
  return {
    get saved() {
      return state.saved;
    },
    set saved(val) {
      state.saved = val;
    },
    getAvailability: vi.fn(async () => ({ available: true, biometryType: 'faceId' as const })),
    saveProtectedToken: vi.fn(async ({ token, account }) => {
      state.saved = { token, account };
      return { saved: true };
    }),
    readProtectedToken: vi.fn(async () => {
      if (!state.saved) {
        const err = new Error('Item not found') as Error & { code: string };
        err.code = 'ITEM_NOT_FOUND';
        throw err;
      }
      return state.saved;
    }),
    hasProtectedToken: vi.fn(async () => ({ exists: Boolean(state.saved) })),
    clearProtectedToken: vi.fn(async () => {
      state.saved = null;
      return { cleared: true };
    }),
  };
}

describe('biometric-auth (iOS Keychain + LocalAuthentication)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryLocalStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('activates biometry voluntarily, stores only refreshToken in Keychain, and migrates/removes localStorage session', async () => {
    const bridge = createFakeKeychainBridge();
    writeStoredMobileSession({
      accessToken: 'acc-1',
      refreshToken: 'ref-1',
      expiresAt: 9999999999,
    });
    expect(readStoredMobileSession()).not.toBeNull();

    const res = await enableBiometricAuth(
      { userId: 'u1', email: 'membro@loja.org', refreshToken: 'ref-1' },
      bridge,
      true,
    );

    expect(res.ok).toBe(true);
    expect(bridge.saved).toEqual({ token: 'ref-1', account: 'u1' });
    // Impede contorno: localStorage não retém mais accessToken nem refreshToken.
    expect(readStoredMobileSession()).toBeNull();
    expect(localStorage.getItem(MOBILE_SESSION_STORAGE_KEY)).toBeNull();
    // Tentativa de gravar sessão depois não recoloca token no localStorage.
    writeStoredMobileSession({ accessToken: 'acc-2', refreshToken: 'ref-2', expiresAt: 9999999999 });
    expect(readStoredMobileSession()).toBeNull();
  });

  it('checks protected session on startup WITHOUT triggering biometric prompt', async () => {
    const bridge = createFakeKeychainBridge();
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);

    const hasSession = await hasBiometricProtectedSession(bridge, true);

    expect(hasSession).toBe(true);
    expect(bridge.hasProtectedToken).toHaveBeenCalledTimes(1);
    expect(bridge.readProtectedToken).not.toHaveBeenCalled();
  });

  it('unlocks via Face ID, validates session on Supabase, and updates rotated refreshToken in Keychain', async () => {
    const bridge = createFakeKeychainBridge();
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);

    const refreshSession = vi.fn(async () => ({
      accessToken: 'acc-new',
      refreshToken: 'ref-rotated',
      expiresAt: 9999999999,
    }));
    const fetchProfile = vi.fn(async () => ({
      user: { id: 'u1', email: 'a@b.com', name: 'Irmão João' },
    }));

    const result = await unlockSessionWithBiometry({
      refreshSession,
      fetchProfile,
      nativePlugin: bridge,
      platformSupported: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.accessToken).toBe('acc-new');
      expect(result.user?.name).toBe('Irmão João');
    }
    expect(refreshSession).toHaveBeenCalledWith('ref-1');
    expect(bridge.saved).toEqual({ token: 'ref-rotated', account: 'u1' });
    expect(readStoredMobileSession()).toBeNull();
  });

  it('handles user cancellation without clearing saved biometry or releasing session', async () => {
    const bridge = createFakeKeychainBridge();
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);
    bridge.readProtectedToken = vi.fn(async () => {
      const err = new Error('User canceled') as Error & { code: string };
      err.code = 'USER_CANCEL';
      throw err;
    });

    const result = await unlockSessionWithBiometry({
      refreshSession: vi.fn(),
      nativePlugin: bridge,
      platformSupported: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('CANCELLED');
    }
    expect(bridge.saved).not.toBeNull();
  });

  it('handles unavailable/locked biometry and hides feature on non-iOS platforms', async () => {
    const bridge = createFakeKeychainBridge();
    const nonIos = await getBiometricAvailability(bridge, false);
    expect(nonIos.available).toBe(false);

    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);
    bridge.readProtectedToken = vi.fn(async () => {
      const err = new Error('Locked') as Error & { code: string };
      err.code = 'BIOMETRY_LOCKOUT';
      throw err;
    });

    const res = await unlockSessionWithBiometry({
      refreshSession: vi.fn(),
      nativePlugin: bridge,
      platformSupported: true,
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.code).toBe('UNAVAILABLE');
  });

  it('invalidates biometric state when device biometry changes (ITEM_NOT_FOUND) or Supabase token expires', async () => {
    const bridge = createFakeKeychainBridge();
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);
    bridge.saved = null; // Simula invalidação automática de .biometryCurrentSet no Keychain

    const invalidated = await unlockSessionWithBiometry({
      refreshSession: vi.fn(),
      nativePlugin: bridge,
      platformSupported: true,
    });
    expect(invalidated.success).toBe(false);
    if (!invalidated.success) expect(invalidated.code).toBe('INVALIDATED');
    expect(localStorage.getItem(BIOMETRIC_META_STORAGE_KEY)).toBeNull();

    // Agora simula token expirado/revogado no Supabase
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-expired' }, bridge, true);
    const expired = await unlockSessionWithBiometry({
      refreshSession: vi.fn(async () => null),
      nativePlugin: bridge,
      platformSupported: true,
    });
    expect(expired.success).toBe(false);
    if (!expired.success) expect(expired.code).toBe('EXPIRED');
    expect(bridge.saved).toBeNull();
    expect(localStorage.getItem(BIOMETRIC_META_STORAGE_KEY)).toBeNull();
  });

  it('clears Keychain on logout, account deletion, user switch, and allows disabling cleanly', async () => {
    const bridge = createFakeKeychainBridge();
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-1' }, bridge, true);

    await syncRotatedRefreshTokenIfBiometricEnabled('ref-2', 'u1', bridge, true);
    expect(bridge.saved?.token).toBe('ref-2');

    // Falha de gravação na rotação limpa o estado biométrico obsoleto sem lançar exceção
    bridge.saveProtectedToken = vi.fn(async () => {
      throw new Error('Keychain write failed');
    });
    const synced = await syncRotatedRefreshTokenIfBiometricEnabled('ref-3', 'u1', bridge, true);
    expect(synced).toBe(false);
    expect(bridge.saved).toBeNull();
    expect(localStorage.getItem(BIOMETRIC_META_STORAGE_KEY)).toBeNull();

    // Logout / exclusão de conta limpa Keychain e impede reutilização
    await clearBiometricAuthState(bridge, true);
    expect(bridge.saved).toBeNull();
    expect(localStorage.getItem(BIOMETRIC_META_STORAGE_KEY)).toBeNull();
    const afterLogout = await unlockSessionWithBiometry({
      refreshSession: vi.fn(),
      nativePlugin: bridge,
      platformSupported: true,
    });
    expect(afterLogout.success).toBe(false);

    // Desativar biometria nas preferências restaura sessão para localStorage sem deslogar
    await enableBiometricAuth({ userId: 'u1', email: 'a@b.com', refreshToken: 'ref-3' }, bridge, true);
    await disableBiometricAuth(
      {
        restoreSession: { accessToken: 'acc-3', refreshToken: 'ref-3', expiresAt: 9999999999 },
        writeSessionToLocalStorage: writeStoredMobileSession,
      },
      bridge,
      true,
    );
    expect(bridge.saved).toBeNull();
    expect(readStoredMobileSession()?.refreshToken).toBe('ref-3');
  });
});

