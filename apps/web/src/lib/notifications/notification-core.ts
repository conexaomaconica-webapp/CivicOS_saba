import { createClient } from '@supabase/supabase-js';
import { assertOperationalTenantId, resolveRequestOperationalTenantId } from '@/lib/tenant/tenant-policy';

/**
 * Núcleo de notificações para uso EXCLUSIVO do servidor (sem 'use server').
 * Não é exposto como Server Action: só código server-side da própria plataforma (pesquisas, aprovações) o importa.
 */

export type NotificationEventType =
  | 'registration_completed'
  | 'contract_signed'
  | 'payment_confirmed'
  | 'payment_pending'
  | 'payment_overdue'
  | 'company_approved'
  | 'company_rejected'
  | 'company_suspended'
  | 'correction_requested'
  | 'masonic_link_verified'
  | 'subscription_expiring'
  | 'quota_reached'
  | 'survey_response_received'
  | 'profile_improvement';

export interface OperationalNotificationItem {
  id: string;
  recipient_email: string;
  recipient_masked_email: string;
  event_type: NotificationEventType;
  title: string;
  body: string;
  action_url?: string;
  channel: 'email' | 'in_app' | 'both';
  is_read: boolean;
  status: 'queued' | 'sent' | 'failed';
  error_details?: string;
  created_at: string;
  sent_at?: string;
}

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export function maskEmailSync(email: string): string {
  if (!email || !email.includes('@')) return 'anunciante@***.com';
  const parts = email.split('@');
  const user = parts[0] || 'usuario';
  const domain = parts[1] || 'conexaomaconica.com.br';
  const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user}***`;
  return `${maskedUser}@${domain}`;
}

export function mapNotificationRow(n: any): OperationalNotificationItem {
  return {
    id: n.id,
    recipient_email: n.recipient_email,
    recipient_masked_email: maskEmailSync(n.recipient_email),
    event_type: n.event_type as NotificationEventType,
    title: n.title,
    body: n.body,
    action_url: n.action_url,
    channel: n.channel || 'both',
    is_read: Boolean(n.is_read),
    status: n.status || 'sent',
    error_details: n.error_details,
    created_at: n.created_at,
    sent_at: n.sent_at,
  };
}

/** Dispara uma notificação operacional (com deduplicação no banco). Chamada apenas por código de servidor confiável. */
export async function dispatchNotification(payload: {
  tenantId?: string;
  recipientId?: string;
  recipientEmail: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actionUrl?: string;
  channel?: 'email' | 'in_app' | 'both';
}): Promise<{ success: boolean; notificationId?: string; deduplicated?: boolean }> {
  const supabase = getAdminSupabase();

  try {
    const { data } = await supabase.rpc('trigger_operational_notification', {
      p_tenant_id: payload.tenantId
        ? assertOperationalTenantId(payload.tenantId, 'Notificação operacional')
        : await resolveRequestOperationalTenantId(supabase),
      p_recipient_id: payload.recipientId || null,
      p_recipient_email: payload.recipientEmail,
      p_event_type: payload.eventType,
      p_title: payload.title,
      p_body: payload.body,
      p_action_url: payload.actionUrl || null,
      p_channel: payload.channel || 'both',
    });

    if (data && data.ok) {
      return {
        success: true,
        notificationId: data.notification_id,
        deduplicated: Boolean(data.deduplicated),
      };
    }
  } catch {
    // Falha de envio não deve derrubar o fluxo que originou o aviso.
  }

  return { success: false };
}
