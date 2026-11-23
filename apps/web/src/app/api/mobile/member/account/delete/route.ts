import {
  authenticateMobileRequest,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
  resolveMobileTenantId,
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

    // Fallback seguro quando o usuário mobile ainda não possui tenant_id no JWT (ex: cadastro via app/site sem claim tenant_id)
    const isTenantUnresolved = /tenant\s+n[aã]o\s+resolvido/i.test(msg);
    if (!isTenantUnresolved) {
      return mobileJsonResponse(
        {
          success: false,
          reason: 'server_error',
          error: `Falha ao processar exclusão: ${msg || 'Erro interno no servidor.'}`,
        },
        400
      );
    }

    const admin = adminClient as any;
    const nowIso = new Date().toISOString();
    const resolvedTenantId =
      (typeof user.app_metadata?.tenant_id === 'string' && user.app_metadata.tenant_id) ||
      (typeof user.user_metadata?.tenant_id === 'string' && user.user_metadata.tenant_id) ||
      (await resolveMobileTenantId(adminClient));

    const [{ data: pendingCheckouts }, { data: pendingAllocations }] = await Promise.all([
      admin
        .from('subscription_checkouts')
        .select('id')
        .eq('user_id', user.id)
        .not('payment_status', 'in', '("refunded","failed","refund_required")')
        .limit(1),
      admin
        .from('founder_allocations')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['reserved', 'granted', 'refund_required'])
        .limit(1),
    ]);

    if ((pendingCheckouts?.length ?? 0) > 0 || (pendingAllocations?.length ?? 0) > 0) {
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

    await admin
      .from('consent_records')
      .update({ granted: false, revoked_at: nowIso, revoked_reason: 'exclusão de conta' })
      .eq('user_id', user.id)
      .eq('granted', true);

    await admin.from('masonic_affiliations').delete().eq('user_id', user.id);

    if (user.email) {
      await admin
        .from('mobile_device_tokens')
        .delete()
        .or(`member_id.eq.${user.id},and(member_id.is.null,member_email.ilike.${user.email})`);
    } else {
      await admin.from('mobile_device_tokens').delete().eq('member_id', user.id);
    }

    await admin
      .from('business_masonic_links')
      .update({ status: 'revoked', updated_at: nowIso })
      .eq('declaring_user_id', user.id)
      .neq('status', 'revoked');

    await admin
      .from('businesses')
      .update({ is_active: false, publication_status: 'suspended', updated_at: nowIso })
      .eq('owner_id', user.id);

    await admin
      .from('profiles')
      .update({ status: 'deleted', deleted_at: nowIso })
      .eq('id', user.id);

    if (resolvedTenantId) {
      try {
        await admin.from('audit_logs').insert({
          tenant_id: resolvedTenantId,
          user_id: user.id,
          action: 'account.deletion_requested',
          resource: 'profiles',
          details: { profile_id: user.id, deleted_at: nowIso, source: 'mobile_admin_fallback' },
        });
      } catch {
        // Auditoria best-effort
      }
    }
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

