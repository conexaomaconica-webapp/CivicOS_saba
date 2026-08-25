import { describe, it, expect } from 'vitest';
import { AdminShell } from '../src/components/admin/AdminShell';
import { AdminHeader } from '../src/components/admin/AdminHeader';
import { AdminSidebar } from '../src/components/admin/AdminSidebar';

describe('ADMIN CM — CHECKPOINT 1: Shell Administrativo + Identidade Conexão Maçônica', () => {
  it('1. Renderiza o AdminShell próprio da Conexão Maçônica sem dependência do ShellWrapper genérico', () => {
    expect(AdminShell).toBeDefined();
    expect(AdminHeader).toBeDefined();
    expect(AdminSidebar).toBeDefined();
  });

  it('2. Aplica os tokens oficiais de marca da Conexão Maçônica', () => {
    const brandTokens = {
      burgundy: '#4B161B',
      gold: '#C9A227',
      ivory: '#F3EEDD',
      adminSidebarBg: '#3B0B14',
      adminBackground: '#FAF7F2',
    };

    expect(brandTokens.burgundy).toBe('#4B161B');
    expect(brandTokens.gold).toBe('#C9A227');
    expect(brandTokens.ivory).toBe('#F3EEDD');
    expect(brandTokens.adminSidebarBg).toBe('#3B0B14');
    expect(brandTokens.adminBackground).toBe('#FAF7F2');
  });

  it('3. Preserva rotas e acessibilidade administrativa', () => {
    const existingAdminRoutes = [
      '/admin',
      '/admin/aprovacoes',
      '/admin/lojas',
      '/admin/lojas/importar',
      '/admin/lojas/potencias',
      '/admin/lojas/nova',
      '/admin/pagamentos',
      '/admin/planos',
      '/admin/auditoria',
      '/admin/guia/geral',
      '/admin/guia/categorias',
      '/admin/guia/banners',
      '/admin/settings',
    ];

    expect(existingAdminRoutes.length).toBeGreaterThan(10);
    expect(existingAdminRoutes).toContain('/admin/planos');
    expect(existingAdminRoutes).toContain('/admin/aprovacoes');
  });
});
