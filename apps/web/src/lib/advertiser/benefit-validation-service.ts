'use server';

import { splitErrorCode } from '@/lib/errors/split-error-code';
import { createServerSideClient } from '@/lib/supabase/server';

function splitCatch(err: unknown, fallback: string): { code?: string; error: string } {
  const { code, message } = splitErrorCode(err, fallback);
  return { ...(code ? { code } : {}), error: message };
}

export interface BenefitLookupResult {
  success: boolean;
  error?: string;
  /** Código técnico (ex.: ALREADY_USED), só para a lógica da tela; o usuário vê apenas `error`. */
  code?: string;
  redemption?: {
    id: string;
    public_code: string;
    status: string; // 'redeemed' | 'used' | 'expired' | 'cancelled'
    raw_status: string;
    redeemed_at: string;
    expires_at: string | null;
    used_at: string | null;
    sale_amount: number | null;
    benefit_snapshot: Record<string, any>;
    user_display_name: string;
  };
}

export interface BenefitConfirmResult {
  success: boolean;
  error?: string;
  /** Código técnico (ex.: ALREADY_USED), só para a lógica da tela; o usuário vê apenas `error`. */
  code?: string;
  redemption?: Record<string, any>;
}

/**
 * Consulta informações sanitizadas de um resgate pelo código público (ex.: CM-483921).
 * Código é normalizado (trim + upper).
 */
export async function lookupRedemptionByCodeAction(
  publicCode: string
): Promise<BenefitLookupResult> {
  try {
    const supabase = await createServerSideClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, code: 'UNAUTHORIZED', error: 'Usuário não autenticado.' };
    }

    if (!publicCode || !publicCode.trim()) {
      return { success: false, code: 'INVALID_CODE', error: 'Código público é obrigatório.' };
    }

    const { data, error } = await (supabase as any).rpc('get_business_benefit_redemption_by_code', {
      p_public_code: publicCode.trim(),
    });

    if (error) {
      const { code, message } = splitErrorCode(error.message, 'Não foi possível concluir a operação.');
      return { success: false, ...(code ? { code } : {}), error: message };
    }

    return {
      success: true,
      redemption: data,
    };
  } catch (err: any) {
    return {
      success: false,
      ...splitCatch(err, 'Erro ao consultar código de resgate.'),
    };
  }
}

/**
 * Confirma a utilização presencial do benefício resgatado pelo código público (ex.: CM-483921).
 * Suporta registro opcional de sale_amount (valor da venda).
 */
export async function confirmRedemptionUseAction(
  publicCode: string,
  saleAmount?: number
): Promise<BenefitConfirmResult> {
  try {
    const supabase = await createServerSideClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, code: 'UNAUTHORIZED', error: 'Usuário não autenticado.' };
    }

    if (!publicCode || !publicCode.trim()) {
      return { success: false, code: 'INVALID_CODE', error: 'Código público é obrigatório.' };
    }

    if (saleAmount !== undefined && saleAmount !== null && saleAmount < 0) {
      return { success: false, code: 'INVALID_SALE_AMOUNT', error: 'Valor da venda não pode ser negativo.' };
    }

    const { data, error } = await (supabase as any).rpc('confirm_business_benefit_redemption', {
      p_public_code: publicCode.trim(),
      p_sale_amount: saleAmount,
    });

    if (error) {
      const { code, message } = splitErrorCode(error.message, 'Não foi possível concluir a operação.');
      return { success: false, ...(code ? { code } : {}), error: message };
    }

    return {
      success: true,
      redemption: data,
    };
  } catch (err: any) {
    return {
      success: false,
      ...splitCatch(err, 'Erro ao confirmar utilização do benefício.'),
    };
  }
}
