import { describe, expect, it } from 'vitest';
import { evaluateMobileMemberAccess, MOBILE_TENANT_SLUG } from './member-access';

const base = {
  authenticated: true,
  tenantSlug: MOBILE_TENANT_SLUG,
  membershipActive: true,
  profileStatus: 'active' as const,
  role: 'member' as const,
};

describe('mobile member access boundary', () => {
  it('allows the shared member experience for member/admin/master', () => {
    for (const role of ['member', 'admin', 'master'] as const) {
      expect(evaluateMobileMemberAccess({ ...base, role })).toEqual({ allowed: true, reason: 'allowed' });
    }
  });

  it('fails closed without authentication, active membership or active profile', () => {
    expect(evaluateMobileMemberAccess({ ...base, authenticated: false }).reason).toBe('unauthenticated');
    expect(evaluateMobileMemberAccess({ ...base, membershipActive: false }).reason).toBe('membership-inactive');
    expect(evaluateMobileMemberAccess({ ...base, profileStatus: 'deleted' }).reason).toBe('profile-inactive');
  });

  it('does not trust a tenant selected by the device', () => {
    expect(evaluateMobileMemberAccess({ ...base, tenantSlug: 'other-tenant' })).toEqual({
      allowed: false,
      reason: 'tenant-mismatch',
    });
  });
});

