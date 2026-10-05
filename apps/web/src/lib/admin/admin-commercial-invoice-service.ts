'use server';

import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from './admin-auth-helper';

/**
 * Nota fiscal opcional do onboarding comercial.
 * - Não solicitada (padrão): o pagamento é liberado logo após a assinatura.
 * - Solicitada e não emitida: o pagamento fica em espera.
 * - Emitida: pagamento liberado.
 */
export type CommercialInvoiceState = {
  required: boolean;
  issued_at: string | null;
  number: string | null;
};

export async function getCommercialInvoiceStateAction(
  businessId: string,
): Promise<{ success: boolean; error?: string; state?: CommercialInvoiceState }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();
    const { data, error } = await (supabase as any)
      .from('business_commercial_terms')
      .select('invoice_required, invoice_issued_at, invoice_number')
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) return { success: false, error: 'Não foi possível ler a nota fiscal (a migration 176 foi aplicada?).' };
    if (!data) return { success: false, error: 'Termos comerciais ainda não conferidos para esta empresa.' };
    return {
      success: true,
      state: { required: Boolean(data.invoice_required), issued_at: data.invoice_issued_at || null, number: data.invoice_number || null },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao consultar a nota fiscal.' };
  }
}

export async function updateCommercialInvoiceAction(input: {
  businessId: string;
  required: boolean;
  /** true registra a nota como emitida; false desfaz a emissão. Ignorado quando required = false. */
  issued: boolean;
  number?: string;
}): Promise<{ success: boolean; error?: string; state?: CommercialInvoiceState }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();
    const number = (input.number || '').trim().slice(0, 60);
    const issued = input.required && input.issued;

    const update = {
      invoice_required: input.required,
      invoice_issued_at: issued ? new Date().toISOString() : null,
      invoice_number: issued && number ? number : null,
      invoice_issued_by: issued ? user.id : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from('business_commercial_terms')
      .update(update)
      .eq('business_id', input.businessId)
      .select('invoice_required, invoice_issued_at, invoice_number')
      .maybeSingle();
    if (error) return { success: false, error: 'Não foi possível salvar (a migration 176 foi aplicada?).' };
    if (!data) return { success: false, error: 'Termos comerciais não encontrados para esta empresa.' };

    revalidatePath(`/admin/empresas/${input.businessId}/contratacao`);
    return {
      success: true,
      state: { required: Boolean(data.invoice_required), issued_at: data.invoice_issued_at || null, number: data.invoice_number || null },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar a nota fiscal.' };
  }
}
