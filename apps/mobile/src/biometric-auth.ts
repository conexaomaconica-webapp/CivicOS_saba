import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MobileAuthSessionTokens, MobileMemberUser } from './mobile-member-client';
import { createSecureSessionStore, type SecureVault } from './secure-session-store';

export type BiometryKind = 'faceId' | 'touchId' | 'none';

export interface BiometricAvailability {
  available: boolean;
  biometryType: BiometryKind;
  label: string;
  errorCode?: string;
}

export interface BiometricMetaState {
  enabled: boolean;
  userId: string;
  email: string;
  declined?: boolean;
}

export interface BiometricKeychainNativeBridge {
  getAvailability(): Promise<{ available: boolean; biometryType: BiometryKind; errorCode?: string }>;
  saveProtectedToken(options: { token: string; account: string }): Promise<{ saved: boolean }>;
  readProtectedToken(options: { reason: string }): Promise<{ token: string; account: string }>;
  hasProtectedToken(): Promise<{ exists: boolean }>;
  clearProtectedToken(): Promise<{ cleared: boolean }>;
}

export const BIOMETRIC_META_STORAGE_KEY = 'cm_mobile_biometric_meta_v1';

const BiometricKeychain = registerPlugin<BiometricKeychainNativeBridge>('BiometricKeychain');

export function isIosBiometricPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

export function formatBiometryLabel(biometryType: BiometryKind): string {
  if (biometryType === 'faceId') return 'Face ID';
  if (biometryType === 'touchId') return 'Touch ID';
  return 'Biometria';
}

export function readBiometricMeta(): BiometricMetaState | null {
  try {
    const raw = localStorage.getItem(BIOMETRIC_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiometricMetaState>;
    if (typeof parsed?.userId !== 'string' || typeof parsed?.email !== 'string') return null;
    return {
      enabled: Boolean(parsed.enabled),
      userId: parsed.userId,
      email: parsed.email,
      declined: Boolean(parsed.declined),
    };
  } catch {
    return null;
  }
}

export function writeBiometricMeta(meta: BiometricMetaState | null): void {
  try {
    if (!meta) {
      localStorage.removeItem(BIOMETRIC_META_STORAGE_KEY);
    } else {
      localStorage.setItem(BIOMETRIC_META_STORAGE_KEY, JSON.stringify(meta));
    }
  } catch {
    // Ignore storage errors
  }
}

export function isBiometricEnabledInStorage(): boolean {
  const meta = readBiometricMeta();
  return Boolean(meta?.enabled);
}

export function markBiometricPromptDeclined(userId: string, email: string): void {
  writeBiometricMeta({
    enabled: false,
    userId,
    email,
    declined: true,
  });
}

/**
 * Adapta o plugin nativo Keychain (.biometryCurrentSet) ao contrato existente `SecureVault`.
 */
export function createBiometricKeychainVault(
  account: string,
  reason = 'Confirme sua identidade para acessar sua conta na Conexão Maçônica.',
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
): SecureVault {
  return {
    async get() {
      const { exists } = await nativePlugin.hasProtectedToken();
      if (!exists) return null;
      const res = await nativePlugin.readProtectedToken({ reason });
      return JSON.stringify({
        accessToken: '',
        refreshToken: res.token,
        userId: res.account || account,
        expiresAt: 0,
      });
    },
    async set(_key, value) {
      const parsed = JSON.parse(value) as { refreshToken?: string; userId?: string };
      if (!parsed.refreshToken) return;
      await nativePlugin.saveProtectedToken({
        token: parsed.refreshToken,
        account: parsed.userId || account,
      });
    },
    async remove() {
      await nativePlugin.clearProtectedToken();
    },
  };
}

export async function getBiometricAvailability(
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<BiometricAvailability> {
  if (!platformSupported) {
    return { available: false, biometryType: 'none', label: 'Biometria' };
  }
  try {
    const res = await nativePlugin.getAvailability();
    const biometryType: BiometryKind =
      res.biometryType === 'faceId' || res.biometryType === 'touchId' ? res.biometryType : 'none';
    return {
      available: Boolean(res.available) && biometryType !== 'none',
      biometryType,
      label: formatBiometryLabel(biometryType),
      errorCode: res.errorCode || undefined,
    };
  } catch {
    return { available: false, biometryType: 'none', label: 'Biometria', errorCode: 'BIOMETRY_UNAVAILABLE' };
  }
}

export async function hasBiometricProtectedSession(
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<boolean> {
  if (!platformSupported) return false;
  const meta = readBiometricMeta();
  if (!meta?.enabled) return false;
  try {
    const { exists } = await nativePlugin.hasProtectedToken();
    return Boolean(exists);
  } catch {
    return false;
  }
}

export async function enableBiometricAuth(
  params: {
    userId: string;
    email: string;
    refreshToken: string;
    sessionStorageKey?: string;
  },
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<{ ok: boolean; error?: string }> {
  if (!platformSupported) {
    return { ok: false, error: 'Biometria disponível apenas no aplicativo iOS.' };
  }
  if (!params.refreshToken || !params.userId) {
    return { ok: false, error: 'Sessão inválida para ativar biometria.' };
  }
  try {
    const store = createSecureSessionStore(createBiometricKeychainVault(params.userId, undefined, nativePlugin));
    await store.write({
      accessToken: '',
      refreshToken: params.refreshToken,
      userId: params.userId,
      expiresAt: 0,
    });
    writeBiometricMeta({
      enabled: true,
      userId: params.userId,
      email: params.email,
      declined: false,
    });
    // Remove cópia persistente de sessão no localStorage para impedir contorno da biometria.
    try {
      localStorage.removeItem(params.sessionStorageKey || 'cm_mobile_auth_session');
    } catch {
      // Ignore
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Não foi possível salvar a credencial protegida no Keychain.' };
  }
}

export async function syncRotatedRefreshTokenIfBiometricEnabled(
  refreshToken: string,
  userId?: string,
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<boolean> {
  if (!platformSupported || !refreshToken) return true;
  const meta = readBiometricMeta();
  if (!meta?.enabled) return true;
  const targetUserId = userId || meta.userId;
  if (!targetUserId || targetUserId !== meta.userId) return true;
  try {
    await nativePlugin.saveProtectedToken({
      token: refreshToken,
      account: targetUserId,
    });
    return true;
  } catch {
    // Falha ao gravar o novo refreshToken rotacionado no Keychain:
    // limpa a vinculação biométrica antiga para não manter token revogado no Keychain,
    // preservando a sessão atual em memória e permitindo recuperação via login convencional.
    await clearBiometricAuthState(nativePlugin, platformSupported);
    return false;
  }
}

export async function disableBiometricAuth(
  options: {
    restoreSession?: MobileAuthSessionTokens | null;
    writeSessionToLocalStorage?: (session: MobileAuthSessionTokens | null) => void;
  } = {},
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<void> {
  const prevMeta = readBiometricMeta();
  if (prevMeta) {
    writeBiometricMeta({
      enabled: false,
      userId: prevMeta.userId,
      email: prevMeta.email,
      declined: true,
    });
  } else {
    writeBiometricMeta(null);
  }
  if (platformSupported) {
    try {
      await nativePlugin.clearProtectedToken();
    } catch {
      // Ignore
    }
  }
  if (options.restoreSession && options.writeSessionToLocalStorage) {
    options.writeSessionToLocalStorage(options.restoreSession);
  }
}

export async function clearBiometricAuthState(
  nativePlugin: BiometricKeychainNativeBridge = BiometricKeychain,
  platformSupported: boolean = isIosBiometricPlatform(),
): Promise<void> {
  writeBiometricMeta(null);
  if (platformSupported) {
    try {
      await nativePlugin.clearProtectedToken();
    } catch {
      // Ignore
    }
  }
}

export type BiometricUnlockResult =
  | {
      success: true;
      session: MobileAuthSessionTokens;
      user: MobileMemberUser | null;
    }
  | {
      success: false;
      code: 'CANCELLED' | 'INVALIDATED' | 'EXPIRED' | 'UNAVAILABLE' | 'KEYCHAIN_ERROR';
      error: string;
    };

function extractPluginErrorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    if (typeof rec.code === 'string') return rec.code;
    if (typeof rec.message === 'string') return rec.message;
  }
  return '';
}

export async function unlockSessionWithBiometry(
  deps: {
    refreshSession: (refreshToken: string) => Promise<MobileAuthSessionTokens | null>;
    fetchProfile?: (session: MobileAuthSessionTokens) => Promise<{ user: MobileMemberUser } | null>;
    readStoredUser?: () => MobileMemberUser | null;
    reason?: string;
    nativePlugin?: BiometricKeychainNativeBridge;
    platformSupported?: boolean;
  },
): Promise<BiometricUnlockResult> {
  const nativePlugin = deps.nativePlugin ?? BiometricKeychain;
  const platformSupported = deps.platformSupported ?? isIosBiometricPlatform();

  if (!platformSupported) {
    return {
      success: false,
      code: 'UNAVAILABLE',
      error: 'A autenticação biométrica está disponível apenas no aplicativo iOS.',
    };
  }

  const meta = readBiometricMeta();
  if (!meta?.enabled) {
    return {
      success: false,
      code: 'UNAVAILABLE',
      error: 'Ative o acesso biométrico após entrar com seu e-mail e senha.',
    };
  }

  let refreshToken = '';
  try {
    const res = await nativePlugin.readProtectedToken({
      reason: deps.reason || 'Confirme sua identidade para acessar sua conta na Conexão Maçônica.',
    });
    refreshToken = res.token;
    if (res.account && res.account !== meta.userId) {
      await clearBiometricAuthState(nativePlugin, platformSupported);
      return {
        success: false,
        code: 'INVALIDATED',
        error: 'Credencial biométrica divergente. Entre novamente com seu e-mail e senha.',
      };
    }
  } catch (err) {
    const code = extractPluginErrorCode(err);
    if (code.includes('USER_CANCEL')) {
      return {
        success: false,
        code: 'CANCELLED',
        error: 'Autenticação biométrica cancelada. Você pode tentar novamente ou entrar com e-mail e senha.',
      };
    }
    if (code.includes('ITEM_NOT_FOUND')) {
      await clearBiometricAuthState(nativePlugin, platformSupported);
      return {
        success: false,
        code: 'INVALIDATED',
        error: 'Sua biometria foi alterada ou removida no aparelho. Entre com e-mail e senha para reativar.',
      };
    }
    if (code.includes('BIOMETRY_LOCKOUT') || code.includes('BIOMETRY_UNAVAILABLE')) {
      return {
        success: false,
        code: 'UNAVAILABLE',
        error: 'Biometria temporariamente indisponível no aparelho. Entre com seu e-mail e senha.',
      };
    }
    return {
      success: false,
      code: 'KEYCHAIN_ERROR',
      error: 'Não foi possível validar sua credencial protegida. Entre com e-mail e senha.',
    };
  }

  if (!refreshToken) {
    await clearBiometricAuthState(nativePlugin, platformSupported);
    return {
      success: false,
      code: 'INVALIDATED',
      error: 'Credencial biométrica ausente. Entre novamente com e-mail e senha.',
    };
  }

  // Valida e renova a sessão diretamente no servidor Supabase antes de liberar a interface autenticada.
  const nextSession = await deps.refreshSession(refreshToken);
  if (!nextSession?.accessToken || !nextSession?.refreshToken) {
    await clearBiometricAuthState(nativePlugin, platformSupported);
    return {
      success: false,
      code: 'EXPIRED',
      error: 'Sua sessão expirou ou foi encerrada. Entre novamente com seu e-mail e senha.',
    };
  }

  await syncRotatedRefreshTokenIfBiometricEnabled(
    nextSession.refreshToken,
    meta.userId,
    nativePlugin,
    platformSupported,
  );

  let user: MobileMemberUser | null = deps.readStoredUser ? deps.readStoredUser() : null;
  if (deps.fetchProfile) {
    try {
      const overview = await deps.fetchProfile(nextSession);
      if (overview?.user) {
        user = overview.user;
      }
    } catch {
      // Fallback to cached user metadata if profile fetch fails temporarily.
    }
  }

  return {
    success: true,
    session: nextSession,
    user,
  };
}

