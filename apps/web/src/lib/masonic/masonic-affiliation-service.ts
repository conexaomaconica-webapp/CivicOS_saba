import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { sanitizeCimb, type MasonicStatus } from '@/lib/masonic/masonic-affiliation';
import type { MasonicDraft } from '@/lib/onboarding/responsible-flow';

// ---------------------------------------------------------------------------
// ADV-001b — persistência do vínculo maçônico declarado no onboarding (W1).
// A afiliação é pessoal (1:1 por usuário) e alimenta o selo fraterno.
// ---------------------------------------------------------------------------

export interface UpsertAffiliationResult {
  ok: boolean;
  error: string | null;
}

/**
 * CRIT-VSC-003 — persiste a afiliação maçônica do responsável (usuário atual)
 * de forma idempotente (ON CONFLICT user_id). Usado no submit do W2, que já
 * corrige a sessão do usuário autenticado.
 */
export async function upsertMasonicAffiliation(
  supabase: SupabaseClient<Database>,
  affiliation: MasonicDraft,
): Promise<UpsertAffiliationResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Sessão inválida. Entre novamente.' };
  }

  if (affiliation.status === 'none') {
    return { ok: true, error: null };
  }

  const row = {
    user_id: user.id,
    status: affiliation.status,
    is_active:
      affiliation.status === 'mason' ? affiliation.isActive === true : false,
    cimb_code: sanitizeCimb(affiliation.cimbCode) || null,
    lodge_name: affiliation.lodgeName.trim() || null,
    chapter_name: affiliation.chapterName.trim() || null,
    spouse_mason_name: affiliation.spouseMasonName.trim() || null,
  };

  const { error } = await supabase
    .from('masonic_affiliations')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function loadMasonicAffiliation(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MasonicDraft | null> {
  const { data } = await supabase
    .from('masonic_affiliations')
    .select('status, is_active, cimb_code, lodge_name, chapter_name, spouse_mason_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    status: data.status as MasonicStatus,
    isActive: data.is_active === true,
    cimbCode: data.cimb_code ?? '',
    lodgeName: data.lodge_name ?? '',
    chapterName: data.chapter_name ?? '',
    spouseMasonName: data.spouse_mason_name ?? '',
    masonicConsent: false,
  };
}