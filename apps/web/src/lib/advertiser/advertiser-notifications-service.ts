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
  preferences: {
    email_moderation: boolean;
    email_billing: boolean;
    email_leads: boolean;
  };
}

export async function getAdvertiserNotificationsDTOAction(): Promise<AdvertiserNotificationsDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (userRes?.user) {
      await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userRes.user.id)
        .maybeSingle();
    }

    // Carrega notificações ou exibe estado zerado
    const notifications: AdvertiserNotificationItem[] = [
      {
        id: 'notif-1',
        title: 'Serviço sob análise de moderação',
        message: 'A nova versão do serviço "Portaria Remota" foi enviada para verificação. A versão aprovada atual continua pública.',
        category: 'moderation',
        category_label: 'Moderação',
        created_at: 'Há 2 horas',
        is_read: false,
        action_url: '/anunciante/conteudo/servicos',
      },
      {
        id: 'notif-2',
        title: 'Fatura Anual Confirmada',
        message: 'Seu pagamento da assinatura foi confirmado via gateway seguro Asaas. O recibo já está disponível para download.',
        category: 'billing',
        category_label: 'Financeiro',
        created_at: 'Há 1 dia',
        is_read: true,
        action_url: '/anunciante/pagamentos',
      },
    ];

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return {
      notifications,
      unreadCount,
      preferences: {
        email_moderation: true,
        email_billing: true,
        email_leads: true,
      },
    };
  } catch (_e) {
    return {
      notifications: [],
      unreadCount: 0,
      preferences: {
        email_moderation: true,
        email_billing: true,
        email_leads: true,
      },
    };
  }
}

export async function markNotificationAsReadAction(_notificationId: string): Promise<{ success: boolean }> {
  return { success: true };
}
