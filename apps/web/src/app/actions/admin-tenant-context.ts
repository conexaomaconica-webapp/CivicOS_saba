'use server';

import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';

export async function getCanonicalAdminTenantAction(): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    return { success: true, tenantId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Tenant administrativo não identificado.' };
  }
}
