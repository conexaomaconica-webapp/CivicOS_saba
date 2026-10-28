import { createServerSideClient } from '@/lib/supabase/server';

export interface BusinessAnalyticsAuthResult {
  authorized: boolean;
  userId: string;
  businessId: string;
  tenantId: string;
  role: string;
  isPlatformAdmin: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validação de Autorização Multi-Tenant para Acesso a Métricas de Analytics.
 *
 * Regras estritas:
 * 1. Exige sessão autenticada (rejeita anônimos com UNAUTHORIZED).
 * 2. Valida UUID da empresa para prevenir enumeração maliciosa.
 * 3. Valida se a empresa existe e está ativa no banco.
 * 4. Valida se o usuário autenticado é:
 *    a) Proprietário da empresa (businesses.owner_id = user.id)
 *    b) Membro ativo da equipe (business_members com status = 'active')
 *    c) Administrador de plataforma (profiles.role IN admin/superadmin/platform_admin/master/socio_admin)
 * 5. Rejeita usuários revogados (status = 'revoked') ou pertencentes a outras empresas.
 */
export async function assertBusinessAnalyticsAccess(
  businessId: string,
  customClient?: any
): Promise<BusinessAnalyticsAuthResult> {
  const normalizedId = String(businessId || '').trim();

  // 1. Validação do identificador para evitar enumeração e injeções
  if (!normalizedId || !UUID_REGEX.test(normalizedId)) {
    throw new Error('FORBIDDEN: Empresa inválida ou acesso não autorizado.');
  }

  // 2. Resolução do cliente Supabase e da sessão autenticada
  const supabase = customClient || (await createServerSideClient());
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authErr || !user) {
    throw new Error('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.');
  }

  // 3. Consulta da empresa solicitada (respeitando tenant_id e is_active)
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, tenant_id, owner_id, is_active')
    .eq('id', normalizedId)
    .maybeSingle();

  if (bizErr || !business || !business.is_active) {
    // Resposta genérica para evitar enumeração de existência de empresas
    throw new Error('FORBIDDEN: Empresa não localizada ou acesso não autorizado.');
  }

  // 4. Verificação de Proprietário Direto
  if (business.owner_id === user.id) {
    return {
      authorized: true,
      userId: user.id,
      businessId: business.id,
      tenantId: business.tenant_id,
      role: 'owner',
      isPlatformAdmin: false,
    };
  }

  // 5. Verificação de Membro de Equipe da Empresa (apenas status 'active')
  const { data: member } = await supabase
    .from('business_members')
    .select('role, status')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (member && member.status === 'active') {
    return {
      authorized: true,
      userId: user.id,
      businessId: business.id,
      tenantId: business.tenant_id,
      role: member.role || 'manager',
      isPlatformAdmin: false,
    };
  }

  // 6. Verificação de Administrador da Plataforma (Master / Admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = (profile?.role || '').trim().toLowerCase();
  const isPlatformAdmin = ['admin', 'superadmin', 'platform_admin', 'master', 'socio_admin'].includes(userRole);

  if (isPlatformAdmin) {
    return {
      authorized: true,
      userId: user.id,
      businessId: business.id,
      tenantId: business.tenant_id,
      role: userRole,
      isPlatformAdmin: true,
    };
  }

  // 7. Qualquer outro caso é categoricamente rejeitado
  throw new Error('FORBIDDEN: Usuário não possui permissão para visualizar o analytics desta empresa.');
}
