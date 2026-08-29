import { describe, it, expect } from 'vitest';
import { isPlatformAdminRole, isAdminRole, PLATFORM_ADMIN_ROLES } from '@/lib/auth/admin-roles';

describe('ETAPA 2 — Matriz Canônica de Papéis Administrativos (admin-roles.ts)', () => {
  it('deve aprovar todos os papéis administrativos da matriz canônica', () => {
    expect(isPlatformAdminRole('admin')).toBe(true);
    expect(isPlatformAdminRole('superadmin')).toBe(true);
    expect(isPlatformAdminRole('platform_admin')).toBe(true);
    expect(isPlatformAdminRole('master')).toBe(true);
    expect(isPlatformAdminRole('socio_admin')).toBe(true);
  });

  it('deve aprovar papéis administrativos mesmo com maiúsculas/espaços', () => {
    expect(isPlatformAdminRole('  ADMIN ')).toBe(true);
    expect(isPlatformAdminRole('SuperAdmin')).toBe(true);
    expect(isPlatformAdminRole('SOCIO_ADMIN')).toBe(true);
  });

  it('deve rejeitar papéis não administrativos', () => {
    expect(isPlatformAdminRole('advertiser')).toBe(false);
    expect(isPlatformAdminRole('anunciante')).toBe(false);
    expect(isPlatformAdminRole('user')).toBe(false);
    expect(isPlatformAdminRole('guest')).toBe(false);
  });

  it('deve tratar null, undefined e string vazia com segurança sem lançar exceção', () => {
    expect(isPlatformAdminRole(null)).toBe(false);
    expect(isPlatformAdminRole(undefined)).toBe(false);
    expect(isPlatformAdminRole('')).toBe(false);
    expect(isPlatformAdminRole('   ')).toBe(false);
  });

  it('deve expor a constante PLATFORM_ADMIN_ROLES com 5 elementos', () => {
    expect(PLATFORM_ADMIN_ROLES).toContain('admin');
    expect(PLATFORM_ADMIN_ROLES).toContain('superadmin');
    expect(PLATFORM_ADMIN_ROLES).toContain('platform_admin');
    expect(PLATFORM_ADMIN_ROLES).toContain('master');
    expect(PLATFORM_ADMIN_ROLES).toContain('socio_admin');
    expect(PLATFORM_ADMIN_ROLES.length).toBe(5);
  });

  it('isAdminRole deve funcionar como alias idêntico a isPlatformAdminRole', () => {
    expect(isAdminRole('master')).toBe(true);
    expect(isAdminRole('user')).toBe(false);
  });
});
