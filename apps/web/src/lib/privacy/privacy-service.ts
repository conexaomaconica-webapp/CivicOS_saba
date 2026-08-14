import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ---------------------------------------------------------------------------
// DTOs (USR-007 — Gestão de Privacidade & LGPD)
// ---------------------------------------------------------------------------

export interface AcceptanceDto {
  code: string;
  version: string;
  accepted_at: string;
  content_hash: string | null;
}

export interface ConsentDto {
  consent_id: string;
  purpose: string;
  granted: boolean;
  created_at: string;
  withdrawn_at: string | null;
  withdrawal_reason: string | null;
  doc_version: string | null;
}

export interface ExportResult {
  ok: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

export interface SimpleResult {
  ok: boolean;
  error: string | null;
}

export const CONSENT_PURPOSE_LABELS: Record<string, string> = {
  masonic_affiliation_publication: 'Publicação do vínculo maçônico no guia',
  masonic_link_publication: 'Publicação do vínculo comunitário (selo)',
};

// ---------------------------------------------------------------------------
// Queries (RPCs SECURITY DEFINER — apenas dados do próprio titular)
// ---------------------------------------------------------------------------

export async function listMyAcceptances(
  supabase: SupabaseClient<Database>,
): Promise<AcceptanceDto[]> {
  const { data } = await supabase.rpc('list_my_acceptances');
  return data ?? [];
}

export async function listMyConsents(
  supabase: SupabaseClient<Database>,
): Promise<ConsentDto[]> {
  const { data } = await supabase.rpc('list_my_consents');
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Mutations (portabilidade CRIT-TRN-014 + soft-delete)
// ---------------------------------------------------------------------------

export async function exportPersonalData(
  supabase: SupabaseClient<Database>,
): Promise<ExportResult> {
  const { data, error } = await supabase.rpc('export_personal_data');
  if (error) {
    return { ok: false, data: null, error: error.message };
  }
  return { ok: true, data: (data as Record<string, unknown>) ?? null, error: null };
}

export async function revokeMyConsent(
  supabase: SupabaseClient<Database>,
  consentId: string,
  reason?: string,
): Promise<SimpleResult> {
  const { error } = await supabase.rpc('revoke_consent', {
    p_consent_id: consentId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function requestAccountDeletion(
  supabase: SupabaseClient<Database>,
): Promise<SimpleResult> {
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}