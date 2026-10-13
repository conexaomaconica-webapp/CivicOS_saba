import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type AuthorizedMembershipSource =
  | 'admin_user_creation'
  | 'admin_advertiser_creation'
  | 'signup_invite_conversion';

interface ProvisionAuthorizedMembershipInput {
  userId: string;
  tenantId: string;
  profileRole: string;
  membershipRole: 'member' | 'admin' | 'tenant_admin' | 'owner' | 'socio_admin';
  source: AuthorizedMembershipSource;
  createdBy: string;
}

export function membershipRoleForAdministrativeProfile(
  profileRole: string,
): ProvisionAuthorizedMembershipInput['membershipRole'] {
  return profileRole === 'admin' || profileRole === 'socio_admin' ? 'admin' : 'member';
}

export async function provisionAuthorizedMembership(
  adminClient: SupabaseClient<Database>,
  input: ProvisionAuthorizedMembershipInput,
): Promise<void> {
  const { error } = await adminClient.rpc('provision_authorized_tenant_membership', {
    p_user_id: input.userId,
    p_tenant_id: input.tenantId,
    p_profile_role: input.profileRole,
    p_membership_role: input.membershipRole,
    p_source: input.source,
    p_created_by: input.createdBy,
  });

  if (error) {
    throw new Error(`Falha ao provisionar acesso autorizado: ${error.message}`);
  }
}
