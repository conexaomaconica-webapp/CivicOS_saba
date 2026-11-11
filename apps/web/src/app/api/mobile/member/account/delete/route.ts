import {
  authenticateMobileRequest,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth.ok) {
    return mobileJsonResponse(
      { success: false, reason: 'unauthorized', error: auth.error },
      auth.status
    );
  }

  const { user, userClient, adminClient } = auth.ctx;
  if (!adminClient) {
    return mobileJsonResponse(
      {
        success: false,
        reason: 'server_error',
        error: 'Exclusão definitiva indisponível no servidor no momento.',
      },
      503
    );
  }

  // 1. Executa a RPC canônica LGPD (verifica pendências financeiras, revoga consentimentos, vínculos, tokens push e marca perfil como deleted)
  const { error: rpcError } = await (userClient as any).rpc('request_account_deletion');
  if (rpcError) {
    const msg = rpcError.message || '';
    if (msg.includes('ACCOUNT_DELETION_BLOCKED_FINANCIAL')) {
      return mobileJsonResponse(
        {
          success: false,
          reason: 'blocked_financial',
          error:
            'Existem assinaturas ou pagamentos pendentes vinculados à sua conta. Finalize-os antes de solicitar a exclusão definitiva.',
        },
        409
      );
    }
    return mobileJsonResponse(
      {
        success: false,
        reason: 'server_error',
        error: `Falha ao processar exclusão: ${msg || 'Erro interno no servidor.'}`,
      },
      400
    );
  }

  // 2. Remove definitivamente o registro de autenticação do Supabase Auth (auth.users)
  // Isso impede que a mesma conta volte a fazer login com o mesmo e-mail e senha.
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteAuthError) {
    return mobileJsonResponse(
      {
        success: false,
        reason: 'server_error',
        error:
          'Não foi possível concluir a remoção das credenciais de acesso. Tente novamente ou contate o suporte.',
      },
      500
    );
  }

  return mobileJsonResponse({
    success: true,
    reason: 'success',
    message: 'Sua conta e suas credenciais foram excluídas permanentemente do sistema.',
  });
}

