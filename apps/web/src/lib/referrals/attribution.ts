import { cookies } from 'next/headers';

/** Nome do cookie com o id aleatório do navegador usado para atribuir indicações (definido pelo ReferralTracker). */
export const VISITOR_COOKIE = 'cm_vid';

export async function readVisitorKey(): Promise<string | null> {
  try {
    const value = (await cookies()).get(VISITOR_COOKIE)?.value;
    return value && value.length >= 16 && value.length <= 64 ? value : null;
  } catch {
    return null;
  }
}

/** Liga o navegador à conta logada: indicações feitas antes do login passam a valer para esta pessoa. */
export async function linkVisitorToCurrentUser(supabase: any): Promise<void> {
  try {
    const key = await readVisitorKey();
    if (key) await supabase.rpc('link_referrals_to_user', { p_visitor_key: key });
  } catch {}
}

/** Benefício resgatado por uma pessoa que chegou por indicação: avança o funil da empresa. */
export async function markBenefitReferral(supabase: any, businessId: string | null | undefined): Promise<void> {
  if (!businessId) return;
  try {
    await linkVisitorToCurrentUser(supabase);
    await supabase.rpc('referral_mark_benefit', { p_business_id: businessId });
  } catch {}
}
