import { headers } from 'next/headers';

/**
 * Política única de tenant para leitura e gravação operacional.
 *
 * - O tenant operacional é sempre resolvido pelo domínio verificado da requisição
 *   (resolveStrictDomainTenantId). Não existe fallback para tenant padrão.
 * - A Conexão Maçônica opera no tenant 00000000-0000-0000-0000-000000000000. Ele é
 *   o tenant canônico do domínio conexaomaconica.com.br e recebe novos cadastros.
 * - Novos clientes white-label recebem tenants próprios e são resolvidos pelo domínio
 *   deles, sem alteração de código.
 * - O `profile.tenant_id` serve para autorização e vínculo de usuário, não para decidir
 *   onde o conteúdo administrativo será gravado.
 * - O tenant 00000000-0000-0000-0000-000000000010 é de teste e não deve ser usado.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Garante que um tenant resolvido é um UUID válido.
 * Lança erro explícito para ausência ou formato inválido.
 */
export function assertOperationalTenantId(tenantId: unknown, context: string): string {
  const value = typeof tenantId === 'string' ? tenantId.trim().toLowerCase() : '';

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`TENANT_NOT_RESOLVED: ${context} não possui tenant válido.`);
  }

  return value;
}

export function normalizeRequestHost(rawHost: string | null | undefined): string {
  const firstHost = (rawHost || '').split(',')[0] ?? '';
  return firstHost
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

export async function getRequestHost(): Promise<string> {
  const requestHeaders = await headers();
  return normalizeRequestHost(requestHeaders.get('x-forwarded-host') || requestHeaders.get('host'));
}

/**
 * Tenant operacional do domínio da requisição, usando um cliente já autenticado.
 */
export async function resolveRequestOperationalTenantId(supabase: unknown): Promise<string> {
  return resolveStrictDomainTenantId(supabase, await getRequestHost());
}

/**
 * Tenant de uma empresa, lido do banco. Usado por fluxos que gravam registros
 * filhos (mídias, auditoria, vínculos) e devem herdar o tenant do pai.
 */
export async function resolveBusinessTenantIdFromDb(
  supabase: unknown,
  businessId: string | null | undefined,
): Promise<string> {
  if (!businessId) {
    throw new Error('TENANT_NOT_RESOLVED: Empresa não informada para resolver o tenant.');
  }

  const { data, error } = await (supabase as any)
    .from('businesses')
    .select('tenant_id')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`TENANT_NOT_RESOLVED: Falha ao localizar o tenant da empresa ${businessId}.`);
  }

  return assertOperationalTenantId(data?.tenant_id, `Empresa ${businessId}`);
}

/**
 * Resolve o tenant operacional a partir de um domínio verificado.
 * Usa a RPC estrita `_resolve_verified_tenant_domain`, sem fallback para tenant padrão.
 * Domínio não cadastrado, não verificado, sem SSL ativo ou com tenant desabilitado gera erro.
 */
export async function resolveStrictDomainTenantId(supabase: unknown, host: string): Promise<string> {
  if (!host) {
    throw new Error('TENANT_NOT_RESOLVED: Domínio não identificado.');
  }

  const { data, error } = await (supabase as any).rpc('_resolve_verified_tenant_domain', { p_host: host });

  if (error) {
    throw new Error('TENANT_NOT_RESOLVED: Falha ao consultar o tenant do domínio.');
  }

  return assertOperationalTenantId(data, `Domínio ${host}`);
}
