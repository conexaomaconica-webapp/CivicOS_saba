import { Capacitor } from '@capacitor/core';
import { PushNotifications, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';

const SUPABASE_URL = 'https://rwvztwsjcjljphqttiws.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dnp0d3NqY2psanBocXR0aXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk4MTIsImV4cCI6MjEwMTM2NTgxMn0.1p7e82BNjYQBKkOdbSlXZ0WLiV-Hl8T-IGicUTn9GHc';

export interface PushRegistrationInfo {
  token: string;
  memberEmail?: string | null;
  memberId?: string | null;
}

export async function sendTokenToSupabase(info: PushRegistrationInfo): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_mobile_device_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_token: info.token,
        p_platform: Capacitor.getPlatform(),
        p_member_email: info.memberEmail || null,
        p_member_id: info.memberId || null,
        p_device_info: {
          platform: Capacitor.getPlatform(),
          is_native: Capacitor.isNativePlatform(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      }),
    });

    if (!res.ok) {
      console.warn('Erro ao registrar token no Supabase:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha na comunicação de push com o Supabase:', err);
    return false;
  }
}

export function setupPushNotifications(callbacks?: {
  onTokenReceived?: (token: string) => void;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onActionPerformed?: (action: ActionPerformed) => void;
  getMemberUser?: () => { id?: string; email?: string } | null;
}) {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications: ambiente não nativo (navegador), ignorando.');
    return;
  }

  // Verificar e pedir permissão
  PushNotifications.checkPermissions()
    .then((status) => {
      if (status.receive === 'granted') {
        return PushNotifications.register();
      }
      return PushNotifications.requestPermissions().then((reqStatus) => {
        if (reqStatus.receive === 'granted') {
          return PushNotifications.register();
        }
        console.log('Permissão de notificações push não concedida pelo usuário.');
      });
    })
    .catch((err) => {
      console.warn('Erro ao checar permissões de push:', err);
    });

  // Listener para captura do Token FCM
  PushNotifications.addListener('registration', (token) => {
    console.log('FCM Device Token registrado com sucesso:', token.value);
    localStorage.setItem('cm_fcm_device_token', token.value);
    callbacks?.onTokenReceived?.(token.value);

    const member = callbacks?.getMemberUser?.();
    sendTokenToSupabase({
      token: token.value,
      memberEmail: member?.email,
      memberId: member?.id,
    });
  });

  // Listener para erro no registro
  PushNotifications.addListener('registrationError', (err) => {
    console.error('Erro no registro do Push FCM:', err.error);
  });

  // Listener quando chega notificação com o app aberto (Foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notificação recebida em foreground:', notification);
    callbacks?.onNotificationReceived?.(notification);
  });

  // Listener quando o usuário toca na notificação (abertura)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Ação da notificação executada:', action);
    callbacks?.onActionPerformed?.(action);
  });
}

