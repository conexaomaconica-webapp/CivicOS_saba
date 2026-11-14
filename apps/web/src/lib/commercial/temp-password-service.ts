'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { getTempPasswordState, validateRepresentativeNewPassword } from './temp-password';

/**
 * Troca obrigatória da senha temporária do representante (Gate 1C.2).
 * A senha atual e a nova NUNCA são registradas (nem em log, nem em auditoria).
 */
export async function changeTemporaryPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  if (!isCommercialModuleEnvEnabled()) return fail('Módulo comercial desativado.');

  const currentPassword = typeof input?.currentPassword === 'string' ? input.currentPassword : '';
  const newPassword = typeof input?.newPassword === 'string' ? input.newPassword : '';
  const confirmPassword = typeof input?.confirmPassword === 'string' ? input.confirmPassword : '';

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user || !user.email) return fail('Sua sessão expirou. Entre novamente.');

  const state = getTempPasswordState(user.app_metadata);
  if (state === 'none') return fail('Não há troca de senha pendente para esta conta.');
  if (state === 'expired') return fail('A senha temporária expirou. Solicite uma nova à equipe comercial.');

  if (!currentPassword) return fail('Informe a senha temporária recebida.');
  const invalid = validateRepresentativeNewPassword(newPassword, currentPassword);
  if (invalid) return fail(invalid);
  if (newPassword !== confirmPassword) return fail('A confirmação não confere com a nova senha.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fail('Serviço indisponível.');

  // Prova que quem troca conhece a senha temporária (a sessão sozinha não basta).
  const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) return fail('A senha temporária informada está incorreta.');

  try {
    const writer = requireWriter();
    const { error } = await writer.auth.admin.updateUserById(user.id, {
      password: newPassword,
      app_metadata: { must_change_password: false, temp_password_expires_at: null },
    });
    if (error) return fail('Não foi possível alterar a senha agora. Tente novamente.');

    const now = new Date().toISOString();
    let tenantId: string | null = null;
    try {
      tenantId = await resolveTenantIdServer();
    } catch {
      tenantId = null;
    }
    let query = writer.from('commercial_representatives').select('id, tenant_id').eq('user_id', user.id).eq('access_mode', 'temp_password');
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data: rep } = await query.maybeSingle();
    if (rep) {
      await writer
        .from('commercial_representatives')
        .update({ password_changed_at: now, temp_password_expires_at: null })
        .eq('id', rep.id)
        .eq('tenant_id', rep.tenant_id);
      await auditCommercial(writer, {
        tenantId: rep.tenant_id as string,
        actorId: user.id,
        entityType: 'commercial_representative',
        entityId: rep.id as string,
        action: 'COMMERCIAL_REP_FIRST_PASSWORD_CHANGE',
        after: { password_changed_at: now },
      });
    }
    return { success: true };
  } catch {
    return fail('Erro ao alterar a senha.');
  }
}
