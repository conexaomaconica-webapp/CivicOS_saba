'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { markBenefitReferral } from '@/lib/referrals/attribution';
import { splitErrorCode } from '@/lib/errors/split-error-code';

export interface BenefitRedemptionResult {
  success: boolean;
  /** Mensagem em português para exibir ao usuário. */
  error?: string;
  /** Código técnico (ex.: USER_LIMIT_EXCEEDED), só para a lógica da tela. */
  code?: string;
  redemption?: {
    id: string;
    public_code: string;
    status: string;
    redeemed_at: string;
    expires_at: string | null;
    benefit_snapshot: Record<string, any>;
  };
}

/**
 * Server Action para acionar a RPC transacional de resgate de benefícios.
 * Exige p_idempotency_key (UUID) conforme contrato do BENEFITS-003.
 */
export async function redeemBenefitAction(
  benefitId: string,
  idempotencyKey: string
): Promise<BenefitRedemptionResult> {
  try {
    const supabase = await createServerSideClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, code: 'UNAUTHORIZED', error: 'Usuário não autenticado.' };
    }

    if (!idempotencyKey) {
      return { success: false, code: 'INVALID_IDEMPOTENCY_KEY', error: 'Chave de idempotência é obrigatória.' };
    }

    const { data, error } = await (supabase as any).rpc('redeem_business_benefit', {
      p_benefit_id: benefitId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const { code, message } = splitErrorCode(error.message, 'Não foi possível resgatar este benefício.');
      return { success: false, ...(code ? { code } : {}), error: message };
    }

    // Funil de indicações: a pessoa indicada resgatou um benefício desta empresa.
    await markBenefitReferral(supabase, (data as any)?.business_id);

    return {
      success: true,
      redemption: data,
    };
  } catch (err: any) {
    const { code, message } = splitErrorCode(err, 'Erro ao processar resgate do benefício.');
    return { success: false, ...(code ? { code } : {}), error: message };
  }
}

/**
 * Busca os resgates efetuados pelo usuário logado (RLS isola por user_id = auth.uid()).
 */
export async function getUserRedemptionsAction() {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autenticado', redemptions: [] };

    const { data, error } = await (supabase as any)
      .from('business_benefit_redemptions')
      .select('*')
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false });

    if (error) throw new Error(error.message);

    return { success: true, redemptions: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message, redemptions: [] };
  }
}
