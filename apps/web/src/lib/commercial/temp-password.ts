/**
 * Senha temporária de representante (Gate 1C.2). Módulo SEM dependências de Node/servidor: é usado também
 * pelo middleware (Edge). Nada aqui lê ou grava banco, e nenhuma função registra a senha.
 *
 * O estado da troca obrigatória vive em auth.users.app_metadata (somente o servidor altera):
 *   must_change_password: true | false
 *   temp_password_expires_at: ISO-8601 | null
 */

export const TEMP_PASSWORD_CHANGE_PATH = '/definir-senha-representante';

export const TEMP_PASSWORD_DEFAULT_HOURS = 72;
export const TEMP_PASSWORD_MIN_HOURS = 24;
export const TEMP_PASSWORD_MAX_HOURS = 168;

export function clampTempPasswordHours(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return TEMP_PASSWORD_DEFAULT_HOURS;
  return Math.min(TEMP_PASSWORD_MAX_HOURS, Math.max(TEMP_PASSWORD_MIN_HOURS, Math.round(n)));
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '#$%&*+-=?@';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

/** Inteiro uniforme em [0, max) por amostragem com rejeição (sem viés de módulo). */
function randomBelow(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buf);
  } while (buf[0]! >= limit);
  return buf[0]! % max;
}

/** Senha aleatória de 14 caracteres (sem caracteres ambíguos), com maiúscula, minúscula, número e símbolo. */
export function generateTempPassword(length = 14): string {
  const size = Math.max(12, length);
  const pick = (set: string) => set[randomBelow(set.length)]!;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBelow(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

/** Regra da NOVA senha do representante: mais exigente que o mínimo geral da plataforma. */
export function validateRepresentativeNewPassword(newPassword: string, tempPassword?: string): string | null {
  if (!newPassword) return 'Informe a nova senha.';
  if (newPassword.length < 10) return 'A nova senha deve ter pelo menos 10 caracteres.';
  if (newPassword.length > 72) return 'A nova senha deve ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return 'Use letras e números na nova senha.';
  if (tempPassword !== undefined && newPassword === tempPassword) return 'A nova senha deve ser diferente da senha temporária.';
  return null;
}

export type TempPasswordState = 'none' | 'pending' | 'expired';

/** Estado a partir do app_metadata do usuário (nunca de user_metadata, que o próprio usuário altera). */
export function getTempPasswordState(appMetadata: unknown, now: number = Date.now()): TempPasswordState {
  const meta = (appMetadata ?? {}) as { must_change_password?: unknown; temp_password_expires_at?: unknown };
  if (meta.must_change_password !== true) return 'none';
  const raw = meta.temp_password_expires_at;
  if (typeof raw === 'string') {
    const expires = new Date(raw).getTime();
    if (Number.isFinite(expires) && expires <= now) return 'expired';
  }
  return 'pending';
}

export type TempPasswordGate =
  | { action: 'allow' }
  | { action: 'redirect_change' }
  | { action: 'sign_out_expired' }
  | { action: 'deny_api' };

/**
 * Decisão do middleware. Com troca pendente só duas rotas funcionam: a página de troca e o login.
 * Senha temporária expirada encerra a sessão. APIs recebem 403 (sem redirecionamento).
 */
export function evaluateTempPasswordGate(pathname: string, state: TempPasswordState): TempPasswordGate {
  if (state === 'none') return { action: 'allow' };
  if (pathname === '/login' || pathname.startsWith('/login/')) return { action: 'allow' };
  if (state === 'expired') return { action: 'sign_out_expired' };
  if (pathname === TEMP_PASSWORD_CHANGE_PATH) return { action: 'allow' };
  if (pathname.startsWith('/_next/')) return { action: 'allow' };
  if (pathname.startsWith('/api/')) return { action: 'deny_api' };
  return { action: 'redirect_change' };
}
