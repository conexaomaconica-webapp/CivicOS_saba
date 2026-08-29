/**
 * Matriz canônica de papéis administrativos do ecossistema Conexão Maçônica / CivicOS SABA.
 * Alinhada com a segurança do Storage (Migration 069) e RPC has_platform_admin_access() (Migration 073).
 */
export const PLATFORM_ADMIN_ROLES = [
  'admin',
  'superadmin',
  'platform_admin',
  'master',
  'socio_admin',
] as const;

export const ADMIN_ROLES = PLATFORM_ADMIN_ROLES;

export type AdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];

/**
 * Valida se um papel (role) do usuário é um papel administrativo reconhecido na matriz canônica.
 */
export function isPlatformAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PLATFORM_ADMIN_ROLES as readonly string[]).includes(role.trim().toLowerCase());
}

/**
 * Alias de conveniência para isPlatformAdminRole.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return isPlatformAdminRole(role);
}
