/**
 * Senha temporária de CONTAS comuns (anunciante e membro), definida pelo administrador.
 *
 * Espelha o desenho já testado do representante comercial (lib/commercial/temp-password.ts), mas é independente dele:
 *  - usa chaves próprias no app_metadata (o representante usa must_change_password e depende do módulo comercial);
 *  - NÃO depende do módulo comercial: a tela de troca fica em /definir-senha, para qualquer conta.
 *
 * O estado vive no app_metadata, que SÓ o servidor altera (user_metadata o próprio usuário edita, então nunca serve de autoridade).
 */

export const ACCOUNT_PASSWORD_CHANGE_PATH = '/definir-senha';

export const ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS = 72;

export const ACCOUNT_MUST_CHANGE_KEY = 'account_must_change_password';
export const ACCOUNT_EXPIRES_KEY = 'account_temp_password_expires_at';

export type AccountTempPasswordState = 'none' | 'pending' | 'expired';

/** Estado a partir do app_metadata do usuário. */
export function getAccountTempPasswordState(appMetadata: unknown, now: number = Date.now()): AccountTempPasswordState {
  const meta = (appMetadata ?? {}) as Record<string, unknown>;
  if (meta[ACCOUNT_MUST_CHANGE_KEY] !== true) return 'none';
  const raw = meta[ACCOUNT_EXPIRES_KEY];
  if (typeof raw === 'string') {
    const expires = new Date(raw).getTime();
    if (Number.isFinite(expires) && expires <= now) return 'expired';
  }
  return 'pending';
}

/** app_metadata a gravar quando o administrador define uma senha temporária (troca obrigatória, com validade). */
export function accountTempPasswordPending(hours: number = ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS, now: number = Date.now()) {
  const safeHours = Number.isFinite(hours) ? Math.min(168, Math.max(1, Math.round(hours))) : ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS;
  return {
    [ACCOUNT_MUST_CHANGE_KEY]: true,
    [ACCOUNT_EXPIRES_KEY]: new Date(now + safeHours * 3_600_000).toISOString(),
  };
}

/** app_metadata a gravar quando a troca foi concluída. */
export const ACCOUNT_TEMP_PASSWORD_CLEARED = {
  [ACCOUNT_MUST_CHANGE_KEY]: false,
  [ACCOUNT_EXPIRES_KEY]: null,
} as const;
