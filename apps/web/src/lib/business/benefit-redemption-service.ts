'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface BenefitRedemptionResult {
  success: boolean;
  error?: string;
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
      return { success: false, error: 'UNAUTHORIZED: Usuário não autenticado.' };
    }

    if (!idempotencyKey) {
      return { success: false, error: 'INVALID_IDEMPOTENCY_KEY: Chave de idempotência é obrigatória.' };
    }

    const { data, error } = await (supabase as any).rpc('redeem_business_benefit', {
      p_benefit_id: benefitId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      redemption: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao processar resgate do benefício.',
    };
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
