'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAccountTempPasswordState } from '@/lib/auth/account-temp-password';
import { clearAccountTempPassword, getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { validateRepresentativeNewPassword } from '@/lib/commercial/temp-password';

export type ChangeAccountPasswordResult = { success: true } | { success: false; error: string };

/**
 * Troca obrigatória da senha temporária definida pelo administrador (anunciante ou membro).
 * A senha atual e a nova NUNCA são registradas (nem em log, nem em auditoria).
 * Exige a senha temporária (a sessão sozinha não basta) e que a troca esteja de fato pendente e dentro da validade.
 */
export async function changeAccountTemporaryPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangeAccountPasswordResult> {
  const currentPassword = typeof input?.currentPassword === 'string' ? input.currentPassword : '';
  const newPassword = typeof input?.newPassword === 'string' ? input.newPassword : '';
  const confirmPassword = typeof input?.confirmPassword === 'string' ? input.confirmPassword : '';

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user || !user.email) return { success: false, error: 'Sua sessão expirou. Entre novamente.' };

  const state = getAccountTempPasswordState(user.app_metadata);
  if (state === 'none') return { success: false, error: 'Não há troca de senha pendente para esta conta.' };
  if (state === 'expired') return { success: false, error: 'A senha temporária expirou. Use "Esqueci a senha" ou peça uma nova ao suporte.' };

  if (!currentPassword) return { success: false, error: 'Informe a senha temporária recebida.' };
  const invalid = validateRepresentativeNewPassword(newPassword, currentPassword);
  if (invalid) return { success: false, error: invalid };
  if (newPassword !== confirmPassword) return { success: false, error: 'A confirmação não confere com a nova senha.' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { success: false, error: 'Serviço indisponível.' };

  // Prova que quem troca conhece a senha temporária (cliente sem persistência: não mexe na sessão atual).
  const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) return { success: false, error: 'A senha temporária informada está incorreta.' };

  try {
    const admin = getAccountAdminClient();
    if (!admin) return { success: false, error: 'Serviço indisponível.' };
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return { success: false, error: 'Não foi possível alterar a senha agora. Tente novamente.' };

    const cleared = await clearAccountTempPassword(user.id);
    if (!cleared) return { success: false, error: 'A senha foi alterada, mas não foi possível concluir. Entre novamente com a nova senha.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao alterar a senha.' };
  }
}
