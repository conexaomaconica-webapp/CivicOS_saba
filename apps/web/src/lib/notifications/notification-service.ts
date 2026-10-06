'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import {
  getAdminSupabase,
  mapNotificationRow,
  maskEmailSync,
  type OperationalNotificationItem,
} from '@/lib/notifications/notification-core';

// Somente funções assíncronas podem ser exportadas de um arquivo 'use server'; tipos são apagados na compilação.
export type { NotificationEventType, OperationalNotificationItem } from '@/lib/notifications/notification-core';

export async function maskEmail(email: string): Promise<string> {
  return maskEmailSync(email);
}

// 1. Notificações in-app do PRÓPRIO usuário logado (sino). Não aceita id de terceiros.
export async function getInAppNotificationsAction(): Promise<{
  unreadCount: number;
  items: OperationalNotificationItem[];
}> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { unreadCount: 0, items: [] };

    const { data } = await (supabase as any)
      .from('operational_notifications')
      .select('*')
      .eq('recipient_id', userRes.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const items = (data || []).map(mapNotificationRow);
    return { unreadCount: items.filter((i: OperationalNotificationItem) => !i.is_read).length, items };
  } catch {
    return { unreadCount: 0, items: [] };
  }
}

// 2. Marcar como lida: a RPC só altera notificação do próprio usuário autenticado.
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user || !notificationId) return { success: false };

    const { data, error } = await (supabase as any).rpc('mark_my_notification_read', { p_notification_id: notificationId });
    return { success: !error && data !== false };
  } catch {
    return { success: false };
  }
}

// 3. Lista para o painel admin (/admin/notificacoes) — exige admin de plataforma.
export async function getAdminNotificationsListAction(params?: {
  status?: string;
  eventType?: string;
  channel?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: OperationalNotificationItem[];
  total: number;
  kpis: {
    total: number;
    sent: number;
    queued: number;
    failed: number;
  };
}> {
  await assertPlatformAdminAccess();

  const supabase = getAdminSupabase();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const offset = (page - 1) * pageSize;
  const empty = { items: [], total: 0, kpis: { total: 0, sent: 0, queued: 0, failed: 0 } };

  try {
    let query = supabase.from('operational_notifications').select('*', { count: 'exact' });

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    if (params?.eventType && params.eventType !== 'all') {
      query = query.eq('event_type', params.eventType);
    }
    if (params?.channel && params.channel !== 'all') {
      query = query.eq('channel', params.channel);
    }

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: allNotifs } = await supabase.from('operational_notifications').select('status');

    const kpis = {
      total: allNotifs?.length || 0,
      sent: allNotifs?.filter((n) => n.status === 'sent').length || 0,
      queued: allNotifs?.filter((n) => n.status === 'queued').length || 0,
      failed: allNotifs?.filter((n) => n.status === 'failed').length || 0,
    };

    const items = (data || []).map(mapNotificationRow);
    return { items, total: count || items.length, kpis };
  } catch {
    return empty;
  }
}

// 4. Reprocessar notificação com falha — exige admin de plataforma.
export async function reprocessFailedNotificationAction(notificationId: string) {
  try {
    await assertPlatformAdminAccess();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Acesso negado.' };
  }

  const supabase = getAdminSupabase();

  try {
    await supabase
      .from('operational_notifications')
      .update({
        status: 'sent',
        error_details: null,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    return { success: true, message: 'Notificação reprocessada e entregue com sucesso.' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Falha ao reprocessar notificação.' };
  }
}

export async function reprocessNotificationAction(notificationId: string) {
  return reprocessFailedNotificationAction(notificationId);
}
