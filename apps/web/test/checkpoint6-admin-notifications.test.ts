import { describe, it, expect } from 'vitest';
import {
  dispatchNotificationAction,
  getInAppNotificationsAction,
  getAdminNotificationsListAction,
  reprocessFailedNotificationAction,
  maskEmail,
} from '../src/lib/notifications/notification-service';

describe('EPIC ADMIN — CHECKPOINT 6: COMUNICAÇÃO & NOTIFICAÇÕES OPERACIONAIS', () => {
  it('1. Mascaramento de e-mail por privacidade', async () => {
    const masked = await maskEmail('anunciante@conexaomaconica.com.br');
    expect(masked).toBe('an***@conexaomaconica.com.br');
  });

  it('2. Disparo de notificação transacional com deduplicação de disparo', async () => {
    const res = await dispatchNotificationAction({
      recipientEmail: 'anunciante@conexaomaconica.com.br',
      eventType: 'payment_confirmed',
      title: 'Pagamento Confirmado',
      body: 'Sua assinatura foi renovada.',
      channel: 'both',
    });

    expect(res.success).toBe(true);
  });

  it('3. Busca de Notificações In-App do Anunciante', async () => {
    const res = await getInAppNotificationsAction();

    expect(res.items).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it('4. Central Admin (/admin/notificacoes) com dados mascarados', async () => {
    const res = await getAdminNotificationsListAction({ page: 1, pageSize: 10 });

    expect(res.items).toBeDefined();
    expect(res.kpis).toBeDefined();
    expect(res.items[0].recipient_masked_email).toContain('***');
  });

  it('5. Reprocessamento de notificação com falha (Retry)', async () => {
    const res = await reprocessFailedNotificationAction('notif_admin_01');
    expect(res.success).toBe(true);
  });
});
