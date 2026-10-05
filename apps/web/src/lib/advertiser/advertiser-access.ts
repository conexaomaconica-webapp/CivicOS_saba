import { createServerSideClient } from '@/lib/supabase/server';

/**
 * Para onde mandar quem abriu o Portal do Anunciante sem ter uma empresa:
 * - sem sessão: login, voltando ao portal;
 * - perfil "anunciante" que ainda não cadastrou a empresa: início do cadastro;
 * - membro comum: a própria conta.
 */
export async function resolveNoBusinessRedirectPath(): Promise<string> {
  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return '/login?redirect=%2Fanunciante';

    const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    return profile?.role === 'anunciante' ? '/anunciar/passo-1' : '/minha-conta';
  } catch {
    return '/minha-conta';
  }
}

/** Empresa do usuário: primeiro como dono (owner_id); se não for dono, como membro da equipe (business_members). */
export async function findAdvertiserBusiness(supabase: any, userId: string): Promise<any | null> {
  const { data: owned } = await supabase.from('businesses').select('*').eq('owner_id', userId).maybeSingle();
  if (owned) return owned;

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (!membership?.business_id) return null;

  const { data: managed } = await supabase.from('businesses').select('*').eq('id', membership.business_id).maybeSingle();
  return managed ?? null;
}
