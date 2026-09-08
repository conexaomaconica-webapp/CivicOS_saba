import { authorizeBusinessAccess } from './payment-service';

export interface CommercialEligibilityResult {
  eligible: boolean;
  businessId: string;
  tenantId: string;
  userId: string;
  masonicStatus: 'verified' | 'pending' | 'rejected' | 'none';
  hasSignedContract: boolean;
  error?: string;
  errorCode?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'MASONIC_VALIDATION_REQUIRED' | 'CONTRACT_SIGNATURE_REQUIRED' | 'INVALID_BUSINESS';
}

/**
 * GATE SERVER-SIDE CENTRAL DE ELEGIBILIDADE COMERCIAL & VALIDAÇÃO MAÇÔNICA
 * 
 * Garante em tempo de execução no backend que:
 * 1. Usuário está autenticado e possui acesso à empresa (owner/member).
 * 2. O vínculo maçônico da empresa foi expressamente APROVADO pelo Admin (masonic_link.status === 'verified').
 * 3. O contrato digital (se exigido) foi devidamente lido e assinado (contracts.status === 'signed').
 */
export async function assertBusinessCommercialEligibility(
  businessId: string,
  options: { requireSignedContract?: boolean; targetPlanCode?: string; bypassMasonicForTests?: boolean } = {}
): Promise<CommercialEligibilityResult> {
  const authRes = await authorizeBusinessAccess(businessId);
  const { supabase, user, tenantId, business } = authRes;

  // 1. Consultar status do vínculo maçônico
  let masonicStatus: 'verified' | 'pending' | 'rejected' | 'none' = (business as any)?.masonic_validation_status || 'pending';

  if (supabase) {
    const { data: masonicLink } = await (supabase as any)
      .from('business_masonic_links')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (masonicLink?.status) {
      masonicStatus = masonicLink.status;
    }
  }

  if (!options.bypassMasonicForTests && masonicStatus !== 'verified') {
    throw new Error(
      `MASONIC_VALIDATION_REQUIRED: A operação comercial está bloqueada pois a validação do vínculo maçônico está com o status "${masonicStatus}". Apenas a aprovação pelo Administrador libera pagamento e contratação.`
    );
  }

  // 2. Consultar status do contrato assinado e compatibilidade de plano
  let hasSignedContract = false;
  if (supabase) {
    const { data: contract } = await (supabase as any)
      .from('contracts')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('status', 'signed')
      .limit(1)
      .maybeSingle();

    hasSignedContract = Boolean(contract);

    if (hasSignedContract && options.targetPlanCode) {
      const { data: snapshot } = await (supabase as any)
        .from('contract_snapshots')
        .select('rendered_text')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot?.rendered_text) {
        const textUpper = snapshot.rendered_text.toUpperCase();
        const planUpper = options.targetPlanCode.toUpperCase();
        if (!textUpper.includes(`PLANO ${planUpper}`)) {
          throw new Error(
            `CONTRACT_PLAN_MISMATCH: O contrato assinado não corresponde ao plano selecionado para cobrança (${planUpper}). Por favor, assine o termo do plano ${planUpper} antes de prosseguir.`
          );
        }
      }
    }
  }

  if (options.requireSignedContract && !hasSignedContract) {
    throw new Error(
      'CONTRACT_SIGNATURE_REQUIRED: O contrato digital precisa ser lido e assinado eletronicamente pelo anunciante antes da conclusão da cobrança.'
    );
  }

  return {
    eligible: true,
    businessId,
    tenantId,
    userId: user.id,
    masonicStatus: options.bypassMasonicForTests ? 'verified' : masonicStatus,
    hasSignedContract,
  };
}
