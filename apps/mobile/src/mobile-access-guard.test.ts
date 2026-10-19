import { describe, expect, it } from 'vitest';
import { MOBILE_TENANT_SLUG } from './member-access';
import { guardMobileSurface, isPublicMobileSurface } from './mobile-access-guard';

const authorized = {
  authenticated: true,
  tenantSlug: MOBILE_TENANT_SLUG,
  membershipActive: true,
  profileStatus: 'active' as const,
  role: 'member' as const,
};

describe('mobile access guard', () => {
  it('keeps public discovery available without a session', () => {
    expect(guardMobileSurface('guia', null)).toMatchObject({ allowed: true, publicSurface: true });
    expect(isPublicMobileSurface('empresas')).toBe(true);
  });

  it('requires authorization for private member surfaces', () => {
    expect(guardMobileSurface('favoritos', null)).toMatchObject({ allowed: false, reason: 'unauthenticated' });
    expect(guardMobileSurface('favoritos', authorized)).toMatchObject({ allowed: true, publicSurface: false });
  });

  it('revalidates revocation and rejects a manipulated tenant', () => {
    expect(guardMobileSurface('mural', { ...authorized, membershipActive: false })).toMatchObject({ allowed: false, reason: 'membership-inactive' });
    expect(guardMobileSurface('perfil', { ...authorized, tenantSlug: 'other-tenant' })).toMatchObject({ allowed: false, reason: 'tenant-mismatch' });
  });

  it('does not grant protected access when authorization is temporarily unavailable', () => {
    expect(guardMobileSurface('favoritos', authorized, 'unavailable')).toMatchObject({
      allowed: false,
      authorizationStatus: 'indeterminate',
    });
    expect(guardMobileSurface('guia', null, 'unavailable')).toMatchObject({
      allowed: true,
      authorizationStatus: 'authorized',
    });
  });
});
