import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { ACCOUNT_TEMP_PASSWORD_CLEARED, getAccountTempPasswordState } from '@/lib/auth/account-temp-password';

/**
 * Operações de servidor sobre o estado da senha temporária de contas comuns.
 *
 * ATENÇÃO: este arquivo NÃO é 'use server' de propósito. Funções exportadas de um arquivo 'use server' viram ações chamáveis
 * pelo navegador; estas recebem um userId e usam a chave de serviço, então só podem ser chamadas por código de servidor
 * (rotas e ações já autorizadas).
 */

export function getAccountAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Remove a troca obrigatória de senha da conta, preservando o resto do app_metadata.
 * Retorna true se limpou (ou se não havia nada a limpar) e false se não foi possível.
 */
export async function clearAccountTempPassword(userId: string, knownAppMetadata?: unknown): Promise<boolean> {
  try {
    const admin = getAccountAdminClient();
    if (!admin || !userId) return false;

    let appMetadata = knownAppMetadata as Record<string, unknown> | undefined;
    if (!appMetadata) {
      const { data } = await admin.auth.admin.getUserById(userId);
      appMetadata = (data?.user?.app_metadata ?? {}) as Record<string, unknown>;
    }
    if (getAccountTempPasswordState(appMetadata) === 'none') return true;

    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...appMetadata, ...ACCOUNT_TEMP_PASSWORD_CLEARED },
    });
    return !error;
  } catch {
    return false;
  }
}
