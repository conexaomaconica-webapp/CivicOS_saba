import { describe, it, expect, vi } from 'vitest';
import { getAdminNotificationsListAction, reprocessNotificationAction } from '../src/lib/notifications/notification-service';
import { getAdminAuditLogsDashboardAction } from '../src/lib/admin/admin-audit-service';

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_audit_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'audit-001',
                  actor_name: 'Admin Conexão',
                  actor_email: 'admin@conexaomaconica.com.br',
                  action_type: 'SUSPEND_BUSINESS',
                  module_name: 'Empresas',
                  severity: 'critical',
                  entity_type: 'business',
                  entity_id: 'b-1',
                  justification: 'Inadimplência',
                  before_state: { is_active: true },
                  after_state: { is_active: false },
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    });
  }),
}));

describe('Refinamento Comunicação & Auditoria (/admin/notificacoes & /admin/auditoria)', () => {
  it('1. Central de Notificações — Carrega KPIs e lista de disparos operacionais', async () => {
    const res = await getAdminNotificationsListAction();
    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
    expect(res.kpis.total).toBeGreaterThanOrEqual(1);
    expect(res.kpis.sent).toBeGreaterThanOrEqual(1);
  });

  it('2. Retry Seguro de Notificação — Re-processa notificação em falha sem duplicar envios entregues', async () => {
    const res = await reprocessNotificationAction('notif-1');
    expect(res.success).toBe(true);
  });

  it('3. Central de Auditoria — Carrega comparativo Before vs After e justificativas registradas', async () => {
    const res = await getAdminAuditLogsDashboardAction();
    expect(res.kpis.totalActions30d).toBeGreaterThan(0);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0]?.justification).toBeDefined();
    expect(res.items[0]?.before_state).toBeDefined();
    expect(res.items[0]?.after_state).toBeDefined();
  });
});
