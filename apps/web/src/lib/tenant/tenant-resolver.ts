import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ---------------------------------------------------------------------------
// Tenant resolution for server components/modules (mirrors middleware logic:
// header → cookie → memberships → profile).
// ---------------------------------------------------------------------------

export async function resolveRequestTenantId(
  supabase: SupabaseClient<Database>,
  userId?: string | null,
): Promise<string | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const fromHeader = headerStore.get('x-tenant-id') ?? null;
  if (fromHeader) return fromHeader;

  const fromCookie = cookieStore.get('tenant_id')?.value ?? null;
  if (fromCookie) return fromCookie;

  if (userId) {
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (membership?.tenant_id) return membership.tenant_id;

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle();
    if (profileRow?.tenant_id) return profileRow.tenant_id;
  }

  return null;
}