import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingCycle } from './plans-service';

export interface CreateQuoteInput {
  planId: string;
  billingCycle: BillingCycle;
  couponCode?: string;
}

export interface QuoteErrorResult {
  isError: true;
  code: 'UNAUTHENTICATED' | 'BUSINESS_NOT_FOUND' | 'CHECKOUT_UNAVAILABLE';
  message: string;
}

export type QuoteResult = QuoteErrorResult;

/**
 * Fase 1 containment.
 *
 * The previous implementation returned a random in-memory identifier that
 * looked like a persisted quote. Until the authoritative checkout service
 * persists and signs a quote, this operation must remain unavailable.
 */
export function calculateSubscriptionQuote(
  supabase: SupabaseClient,
  sessionTenantId: string,
  sessionUserId: string,
  businessId: string,
  input: CreateQuoteInput,
): QuoteResult {
  void supabase;
  void input;

  if (!sessionTenantId || !sessionUserId) {
    return {
      isError: true,
      code: 'UNAUTHENTICATED',
      message: 'Sessão inválida ou usuário não autenticado.',
    };
  }

  if (!businessId) {
    return {
      isError: true,
      code: 'BUSINESS_NOT_FOUND',
      message: 'Nenhuma empresa cadastrada encontrada para este anunciante.',
    };
  }

  return {
    isError: true,
    code: 'CHECKOUT_UNAVAILABLE',
    message:
      'A cotação está temporariamente indisponível até ser persistida pelo checkout oficial.',
  };
}
