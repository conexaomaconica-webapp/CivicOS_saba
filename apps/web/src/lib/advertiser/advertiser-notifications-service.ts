'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface AdvertiserNotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'moderation' | 'billing' | 'system' | 'lead';
  category_label: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
}

export interface AdvertiserNotificationsDTO {
  notifications: AdvertiserNotificationItem[];
  unreadCount: number;
}

const CATEGORY_BY_EVENT: Record<string, { category: AdvertiserNotificationItem['category']; label: string }> = {
  payment_confirmed: { category: 'billing', label: 'Financeiro' },
  payment_pending: { category: 'billing', label: 'Financeiro' },
  payment_overdue: { category: 'billing', label: 'Financeiro' },
  subscription_expiring: { category: 'billing', label: 'Financeiro' },
  company_approved: { category: 'moderation', label: 'Moderação' },
  company_rejected: { category: 'moderation', label: 'Moderação' },
  company_suspended: { category: 'moderation', label: 'Moderação' },
  correction_requested: { category: 'moderation', label: 'Moderação' },
  masonic_link_verified: { category: 'moderation', label: 'Moderação' },
  business_milestone: { category: 'system', label: 'Marco da Conexão' },
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffMin < 60 * 24) return `Há ${Math.floor(diffMin / 60)} h`;
  if (diffMin < 60 * 24 * 7) return `Há ${Math.floor(diffMin / (60 * 24))} dia(s)`;
  return date.toLocaleDateString('pt-BR');
}

/** Avisos reais do usuário logado (operational_notifications). Sem dados de exemplo. */
export async function getAdvertiserNotificationsDTOAction(): Promise<AdvertiserNotificationsDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { notifications: [], unreadCount: 0 };

    const { data: rows } = await (supabase as any)
      .from('operational_notifications')
      .select('id, event_type, title, body, action_url, is_read, created_at')
      .eq('recipient_id', userRes.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const notifications: AdvertiserNotificationItem[] = (Array.isArray(rows) ? rows : []).map((row: any) => {
      const meta = CATEGORY_BY_EVENT[row.event_type] ?? { category: 'system' as const, label: 'Sistema' };
      return {
        id: String(row.id),
        title: String(row.title),
        message: String(row.body),
        category: meta.category,
        category_label: meta.label,
        created_at: formatWhen(row.created_at),
        is_read: Boolean(row.is_read),
        action_url: row.action_url ?? undefined,
      };
    });

    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    };
  } catch (_e) {
    return { notifications: [], unreadCount: 0 };
  }
}

/** Marca como lido um aviso do próprio usuário (a função no banco só altera linhas do destinatário). */
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('mark_my_notification_read', { p_notification_id: notificationId });
    return { success: !error && data === true };
  } catch (_e) {
    return { success: false };
  }
}

/** Quantidade de avisos não lidos do usuário logado (selo do menu do portal). */
export async function getAdvertiserUnreadCountAction(): Promise<number> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return 0;
    const { count } = await (supabase as any)
      .from('operational_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userRes.user.id)
      .eq('is_read', false);
    return count ?? 0;
  } catch {
    return 0;
  }
}
