import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminGuard = vi.fn();
const sessionUser = vi.fn();
const rpc = vi.fn();
const queryRows = vi.fn();

vi.mock('../src/lib/admin/admin-auth-helper', () => ({
  assertPlatformAdminAccess: () => adminGuard(),
}));

vi.mock('../src/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(async () => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => ({ data: queryRows(), error: null })),
    };
    return {
      auth: { getUser: async () => ({ data: { user: sessionUser() } }) },
      from: () => builder,
      rpc,
    };
  }),
}));

vi.mock('../src/lib/notifications/notification-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/notifications/notification-core')>();
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return { ...actual, getAdminSupabase: () => ({ from: () => builder }) };
});

import {
  getInAppNotificationsAction,
  getAdminNotificationsListAction,
  markNotificationAsReadAction,
  reprocessFailedNotificationAction,
  maskEmail,
} from '../src/lib/notifications/notification-service';

describe('Notificações operacionais — mascaramento e controle de acesso', () => {
  beforeEach(() => {
    adminGuard.mockReset().mockResolvedValue({});
    sessionUser.mockReset().mockReturnValue({ id: 'user-1' });
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    queryRows.mockReset().mockReturnValue([]);
  });

  it('mascara e-mail por privacidade', async () => {
    expect(await maskEmail('anunciante@conexaomaconica.com.br')).toBe('an***@conexaomaconica.com.br');
  });

  it('sino: sem sessão não retorna nada (nem dados de exemplo)', async () => {
    sessionUser.mockReturnValue(null);
    const res = await getInAppNotificationsAction();
    expect(res).toEqual({ unreadCount: 0, items: [] });
  });

  it('sino: devolve só notificações do usuário logado, com e-mail mascarado', async () => {
    queryRows.mockReturnValue([
      { id: 'n1', recipient_email: 'maria@x.com', event_type: 'company_approved', title: 'T', body: 'B', is_read: false, created_at: '2026-01-01' },
    ]);
    const res = await getInAppNotificationsAction();
    expect(res.unreadCount).toBe(1);
    expect(res.items[0].recipient_masked_email).toBe('ma***@x.com');
  });

  it('marcar como lida: exige sessão e usa a RPC do próprio usuário', async () => {
    sessionUser.mockReturnValue(null);
    expect((await markNotificationAsReadAction('n1')).success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();

    sessionUser.mockReturnValue({ id: 'user-1' });
    expect((await markNotificationAsReadAction('n1')).success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('mark_my_notification_read', { p_notification_id: 'n1' });
  });

  it('lista admin: bloqueia quem não é admin de plataforma', async () => {
    adminGuard.mockRejectedValue(new Error('FORBIDDEN'));
    await expect(getAdminNotificationsListAction({ page: 1 })).rejects.toThrow('FORBIDDEN');
  });

  it('lista admin: admin recebe lista vazia real, sem item fictício', async () => {
    const res = await getAdminNotificationsListAction({ page: 1, pageSize: 10 });
    expect(res.items).toEqual([]);
    expect(res.kpis.total).toBe(0);
  });

  it('reprocessar: negado para não-admin, permitido para admin', async () => {
    adminGuard.mockRejectedValueOnce(new Error('FORBIDDEN'));
    expect((await reprocessFailedNotificationAction('n1')).success).toBe(false);
    expect((await reprocessFailedNotificationAction('n1')).success).toBe(true);
  });
});
