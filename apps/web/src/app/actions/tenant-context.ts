'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { resolveRequestOperationalTenantId } from '@/lib/tenant/tenant-policy';

/**
 * Tenant operacional do domínio atual para telas cliente que criam conteúdo.
 * O perfil do usuário não é usado aqui: ele pode pertencer ao tenant global.
 */
export async function getOperationalTenantAction(): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const tenantId = await resolveRequestOperationalTenantId(supabase);
    return { success: true, tenantId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Tenant não identificado.' };
  }
}
