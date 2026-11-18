'use server';

import { checkRateLimit, getClientIpAddress } from '@/lib/security/rate-limiter';
import { createServerSideClient } from '@/lib/supabase/server';
import { normalizeRecoveryEmail, sendPasswordRecoveryEmail } from '@/lib/auth/password-recovery-email';
import { appUrl } from '@/lib/seo/app-url';

export type RequestRecoveryResult = { success: true } | { success: false; error: string };

/**
 * Pedido público de recuperação de senha. A resposta é a MESMA exista a conta ou não (não revela quais e-mails estão cadastrados).
 * Envia pelo e-mail da plataforma; se o envio próprio não estiver disponível, usa o e-mail do Supabase como alternativa.
 */
export async function requestPasswordRecoveryAction(rawEmail: string): Promise<RequestRecoveryResult> {
  const email = normalizeRecoveryEmail(rawEmail);
  if (!email) return { success: false, error: 'Informe um e-mail válido.' };

  const byIp = await checkRateLimit('auth', await getClientIpAddress());
  const byEmail = await checkRateLimit('passwordRecovery', email);
  if (!byIp.allowed || !byEmail.allowed) {
    return { success: false, error: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente novamente.' };
  }

  const result = await sendPasswordRecoveryEmail(email);
  if (result.ok || result.reason === 'no_account') return { success: true };

  // Falha do envio próprio (não por falta de conta): alternativa pelo e-mail do Supabase.
  try {
    const supabase = await createServerSideClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl('/auth/callback?next=/update-password') });
  } catch {
    // Mesma resposta: nada que revele o estado da conta.
  }
  return { success: true };
}
