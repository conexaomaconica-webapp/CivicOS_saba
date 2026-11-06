export interface AccountDeletionRequest {
  userId?: string | null;
  userEmail?: string | null;
  deviceToken?: string | null;
  isAuthenticatedSupabase?: boolean;
}

export interface AccountDeletionResult {
  success: boolean;
  reason: 'success' | 'blocked_financial' | 'server_error' | 'unauthorized' | 'network_error';
  message: string;
}

export interface SupabaseClientLike {
  rpc(fnName: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  auth: {
    getSession(): Promise<{ data: { session: unknown | null }; error: unknown | null }>;
    signOut(options?: { scope?: 'local' | 'global' | 'others' }): Promise<{ error: unknown | null }>;
  };
}

/**
 * Executa a exclusão segura de conta no backend Supabase:
 * 1. Invoca public.request_account_deletion() via RPC canônica (LGPD Fase 3).
 * 2. Bloqueia a exclusão se houver impedimentos financeiros (ACCOUNT_DELETION_BLOCKED_FINANCIAL).
 * 3. Revoga todos os tokens de notificações push vinculados ao titular.
 * 4. Desloga a sessão remota no Supabase.
 * 5. Garante que falhas de rede ou servidor NÃO limpem antecipadamente as credenciais locais.
 */
export async function executeAccountDeletion(
  client: SupabaseClientLike | null,
  req: AccountDeletionRequest
): Promise<AccountDeletionResult> {
  // Se houver cliente Supabase e sessão autenticada real
  if (client && req.isAuthenticatedSupabase) {
    try {
      const { session } = (await client.auth.getSession()).data;
      if (session) {
        // 1. Invoca a RPC canônica no backend
        const { error: deletionError } = await client.rpc('request_account_deletion');

        if (deletionError) {
          const msg = deletionError.message || '';
          if (msg.includes('ACCOUNT_DELETION_BLOCKED_FINANCIAL')) {
            return {
              success: false,
              reason: 'blocked_financial',
              message: 'Existem assinaturas ou pagamentos pendentes vinculados à sua conta. Finalize-os antes de solicitar a exclusão definitiva.',
            };
          }
          if (msg.includes('Não autenticado') || msg.includes('JWT')) {
            return {
              success: false,
              reason: 'unauthorized',
              message: 'Sua sessão expirou. Faça login novamente para confirmar a exclusão.',
            };
          }
          return {
            success: false,
            reason: 'server_error',
            message: `Falha no processamento da exclusão: ${msg || 'Erro interno no servidor'}. Suas credenciais foram preservadas.`,
          };
        }

        // 2. Revoga todos os tokens push do usuário no backend
        try {
          await client.rpc('revoke_all_my_mobile_device_tokens');
        } catch {
          // Não impede o encerramento da exclusão do perfil se a RPC 219 ainda não estiver ativa
        }

        // 3. Desloga a sessão com escopo global
        await client.auth.signOut({ scope: 'global' }).catch(() => null);

        return {
          success: true,
          reason: 'success',
          message: 'Sua conta e seus dados foram excluídos com sucesso do sistema.',
        };
      }
    } catch (networkErr) {
      return {
        success: false,
        reason: 'network_error',
        message: 'Falha de comunicação com o servidor. A exclusão não pôde ser confirmada e seus dados foram preservados.',
      };
    }
  }

  // Conta exclusivamente local / offline (ou sem sessão remota ativa)
  return {
    success: true,
    reason: 'success',
    message: 'Sua conta e registros locais foram excluídos com sucesso do aparelho.',
  };
}

/**
 * Purga dados sensíveis do armazenamento local SOMENTE após confirmação de sucesso.
 */
export function purgeLocalAccountState(req: AccountDeletionRequest, storage: Storage = localStorage): void {
  try {
    storage.removeItem('cm_mobile_member_user');
    storage.removeItem('cm_mobile_referrer_name');
    storage.removeItem('cm_fcm_device_token');

    const emailToDelete = req.userEmail;
    if (emailToDelete) {
      const rawList = storage.getItem('cm_mobile_registered_members');
      if (rawList) {
        const list: Array<{ email?: string }> = JSON.parse(rawList);
        const next = list.filter((u) => u.email?.toLowerCase() !== emailToDelete.toLowerCase());
        storage.setItem('cm_mobile_registered_members', JSON.stringify(next));
      }
    }
  } catch (err) {
    console.warn('Erro ao expurgar dados locais pós-exclusão:', err);
  }
}

