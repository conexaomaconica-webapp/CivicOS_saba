import { createServerSideClient } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';

/**
 * Para onde mandar quem abriu o Portal do Anunciante sem ter uma empresa:
 * - sem sessão: login, voltando ao portal;
 * - perfil master/admin da plataforma: painel administrativo de empresas;
 * - perfil "anunciante" que ainda não cadastrou a empresa: início do cadastro;
 * - membro comum: a própria conta.
 */
export async function resolveNoBusinessRedirectPath(): Promise<string> {
  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return '/login?redirect=%2Fanunciante';

    const profile = await getProfileAuthorization(supabase, data.user.id);
    if (isPlatformAdminRole(profile?.role)) {
      return '/admin/empresas';
    }
    return profile?.role === 'anunciante' ? '/anunciar/passo-1' : '/minha-conta';
  } catch {
    return '/minha-conta';
  }
}

/**
 * Empresa do anunciante:
 * 1. Primeiro como dono direto (owner_id);
 * 2. Se não for dono, como membro da equipe (business_members);
 * 3. Se for usuário com papel administrativo (master/admin/superadmin) sem empresa cadastrada:
 *    resolve a primeira empresa ativa do tenant para permitir auditoria e visualização do portal.
 */
export async function findAdvertiserBusiness(
  supabase: any,
  userId: string,
  preferredBusinessId?: string | null
): Promise<any | null> {
  const profile = await getProfileAuthorization(supabase, userId).catch(() => null);
  const isMasterOrAdmin = isPlatformAdminRole(profile?.role);

  // 1. Se informou empresa de preferência (ex: query param businessId)
  if (preferredBusinessId) {
    const { data: preferred } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', preferredBusinessId)
      .maybeSingle();

    if (preferred) {
      if (preferred.owner_id === userId || isMasterOrAdmin) return preferred;
      const { data: memberCheck } = await supabase
        .from('business_members')
        .select('id')
        .eq('business_id', preferredBusinessId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (memberCheck) return preferred;
    }
  }

  // 2. Busca como dono (owner_id)
  const { data: owned } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (owned) return owned;

  // 3. Busca como membro da equipe (business_members)
  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (membership?.business_id) {
    const { data: managed } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', membership.business_id)
      .maybeSingle();
    if (managed) return managed;
  }

  // 4. Se for usuário MASTER / ADMIN / SUPERADMIN (não tem empresa pessoal):
  // Permite acesso irrestrito de auditoria/suporte ao portal do anunciante com a primeira empresa ativa
  if (isMasterOrAdmin) {
    let query = supabase.from('businesses').select('*');
    if (profile?.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id);
    }
    const { data: activeFallback } = await query
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeFallback) return activeFallback;

    // Se não houver ativa, tenta qualquer empresa cadastrada
    const { data: anyFallback } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyFallback) return anyFallback;
  }

  return null;
}

/**
 * A empresa informada, somente se for do usuário logado (dono ou equipe) ou se o usuário for master/admin.
 */
export async function findOwnBusinessById(supabase: any, businessId: string): Promise<any | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user || !businessId) return null;

  const profile = await getProfileAuthorization(supabase, userRes.user.id).catch(() => null);
  if (isPlatformAdminRole(profile?.role)) {
    const { data: adminBiz } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
    if (adminBiz) return adminBiz;
  }

  const business = await findAdvertiserBusiness(supabase, userRes.user.id, businessId);
  return business && business.id === businessId ? business : null;
}
