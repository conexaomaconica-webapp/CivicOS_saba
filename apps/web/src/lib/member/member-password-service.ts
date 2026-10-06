'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/auth/validation';

/**
 * Troca de senha do membro logado. Exige a senha atual (verificada em um cliente sem persistência de sessão,
 * para não mexer nos cookies) e aplica a mesma regra de senha do cadastro.
 */
export async function changeMemberPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: 'Sessão expirada. Entre novamente.' };

    const providers: string[] = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
    if (providers.length > 0 && !providers.includes('email')) {
      return { success: false, error: 'Sua conta entra por um provedor externo e não possui senha própria.' };
    }

    const { currentPassword, newPassword, confirmPassword } = input;
    if (!currentPassword) return { success: false, error: 'Informe sua senha atual.' };
    const invalid = validatePassword(newPassword);
    if (invalid) return { success: false, error: invalid };
    if (newPassword !== confirmPassword) return { success: false, error: 'A confirmação não confere com a nova senha.' };
    if (newPassword === currentPassword) return { success: false, error: 'A nova senha deve ser diferente da atual.' };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return { success: false, error: 'Não foi possível alterar a senha agora.' };

    const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) return { success: false, error: 'A senha atual está incorreta.' };

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return { success: false, error: 'Não foi possível alterar a senha agora. Tente novamente.' };
    return { success: true };
  } catch (err) {
    console.error('[changeMemberPasswordAction]', err);
    return { success: false, error: 'Não foi possível alterar a senha agora.' };
  }
}
