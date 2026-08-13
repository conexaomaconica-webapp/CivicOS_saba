import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { validateName } from '@/lib/auth/validation';
import { sanitizeCnpj, validateCnpj, validatePhone } from '@/lib/onboarding/onboarding-validation';

// ---------------------------------------------------------------------------
// ADV-002 (CRIT-VSC-003) — business draft creation + category lookup.
// ---------------------------------------------------------------------------

export interface BusinessCategoryOption {
  id: string;
  name: string;
}

export interface BusinessDraftInput {
  tenantId: string;
  cnpj: string;
  legalName: string;
  tradingName: string;
  phone: string;
  categoryId: string;
}

export interface CreateBusinessResult {
  ok: boolean;
  businessId?: string;
  error: string | null;
}

/**
 * CRIT-VSC-003 — validates and persists the advertiser's business as a draft,
 * binding the current user as the primary owner (owner_id = auth.uid()).
 */
export async function createBusinessDraft(
  supabase: SupabaseClient<Database>,
  input: BusinessDraftInput,
): Promise<CreateBusinessResult> {
  const cnpj = sanitizeCnpj(input.cnpj);
  const legalName = input.legalName.trim();
  const tradingName = input.tradingName.trim();
  const phone = input.phone.trim();
  const categoryId = input.categoryId.trim();
  const tenantId = input.tenantId.trim();

  const cnpjError = validateCnpj(cnpj);
  const legalNameError = validateName(legalName);
  const tradingNameError = validateName(tradingName);
  const phoneError = validatePhone(phone);
  if (cnpjError || legalNameError || tradingNameError || phoneError) {
    return { ok: false, error: cnpjError ?? legalNameError ?? tradingNameError ?? phoneError ?? 'Dados inválidos.' };
  }
  if (!categoryId) {
    return { ok: false, error: 'Selecione uma categoria.' };
  }
  if (!tenantId) {
    return { ok: false, error: 'Identificador do tenant não resolvido. Entre em contato com o administrador.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Sessão inválida. Entre novamente.' };
  }

  // Duplicity check: one active CNPJ per tenant (CRIT-VSC-003).
  const { data: existing, error: duplicateError } = await supabase
    .from('businesses')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('cnpj', cnpj)
    .maybeSingle();
  if (duplicateError) {
    return { ok: false, error: duplicateError.message };
  }
  if (existing) {
    return { ok: false, error: 'Este CNPJ já está cadastrado neste tenant.' };
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      tenant_id: tenantId,
      owner_id: user.id,
      name: tradingName,
      legal_name: legalName,
      cnpj,
      category: categoryId,
      phone,
      publication_status: 'draft',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, businessId: data?.id, error: null };
}

/**
 * CRIT-VSC-003 — categories selectable when registering the business draft.
 */
export async function listBusinessCategories(
  supabase: SupabaseClient<Database>,
): Promise<BusinessCategoryOption[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}