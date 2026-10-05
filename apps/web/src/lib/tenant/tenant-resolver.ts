import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { resolveRequestOperationalTenantId } from './tenant-policy';

/**
 * Tenant operacional da requisição atual.
 *
 * Usa somente o domínio verificado. Header `x-tenant-id`, cookie `tenant_id`
 * e vínculos de perfil/membership são controlados pelo cliente ou servem apenas
 * para autorização, por isso não definem onde o conteúdo é lido ou gravado.
 * Domínio sem tenant verificado gera erro explícito (sem fallback).
 */
export async function resolveRequestTenantId(supabase: SupabaseClient<Database>): Promise<string> {
  return resolveRequestOperationalTenantId(supabase);
}
