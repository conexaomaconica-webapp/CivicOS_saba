import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  membershipRoleForAdministrativeProfile,
  provisionAuthorizedMembership,
} from './authorized-membership-provisioning';

describe('authorized membership provisioning', () => {
  it.each([
    ['admin', 'admin'],
    ['socio_admin', 'admin'],
    ['master', 'member'],
    ['finance', 'member'],
    ['moderator', 'member'],
  ] as const)('maps profile role %s to membership role %s', (profileRole, expected) => {
    expect(membershipRoleForAdministrativeProfile(profileRole)).toBe(expected);
  });

  it('delegates profile and membership provisioning to the atomic server RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await provisionAuthorizedMembership(client, {
      userId: 'user-1',
      tenantId: 'tenant-1',
      profileRole: 'anunciante',
      membershipRole: 'member',
      source: 'admin_advertiser_creation',
      createdBy: 'admin-1',
    });

    expect(rpc).toHaveBeenCalledWith('provision_authorized_tenant_membership', {
      p_user_id: 'user-1',
      p_tenant_id: 'tenant-1',
      p_profile_role: 'anunciante',
      p_membership_role: 'member',
      p_source: 'admin_advertiser_creation',
      p_created_by: 'admin-1',
    });
  });

  it('fails closed when the database rejects provisioning', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ error: { message: 'forbidden' } }),
    } as unknown as SupabaseClient<Database>;

    await expect(provisionAuthorizedMembership(client, {
      userId: 'user-1',
      tenantId: 'tenant-1',
      profileRole: 'member',
      membershipRole: 'member',
      source: 'admin_user_creation',
      createdBy: 'admin-1',
    })).rejects.toThrow('Falha ao provisionar acesso autorizado: forbidden');
  });
});
