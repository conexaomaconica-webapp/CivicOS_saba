import { assertPlatformAdminAccess } from './admin-auth-helper';
import { getRequestHost, resolveStrictDomainTenantId } from '@/lib/tenant/tenant-policy';

/**
 * Contexto administrativo da Conexão Maçônica.
 * O tenant administrado é o tenant verificado do domínio atual. O perfil do admin
 * (que pode pertencer ao tenant global) não define onde o conteúdo é gravado.
 */
export async function resolveCanonicalAdminTenant() {
  const { supabase, user } = await assertPlatformAdminAccess();
  const host = await getRequestHost();
  const tenantId = await resolveStrictDomainTenantId(supabase, host);

  return { supabase, user, tenantId, host };
}
