/**
 * Local mobile authorization boundary.
 *
 * The app has one experience: an authenticated member of the canonical
 * Conexão Maçônica tenant. Tenant membership and account status are facts
 * returned by a trusted backend; the client never derives authorization from
 * a tenant id supplied by the device.
 */

export const MOBILE_TENANT_SLUG = 'conexao-maconica' as const;

export type MobileProfileRole = 'member' | 'admin' | 'master';

export interface MobileAccessContext {
  readonly authenticated: boolean;
  readonly tenantSlug: string | null;
  readonly membershipActive: boolean;
  readonly profileStatus: 'active' | 'deleted' | 'suspended' | null;
  readonly role: MobileProfileRole | null;
}

export interface MobileAccessDecision {
  readonly allowed: boolean;
  readonly reason:
    | 'unauthenticated'
    | 'tenant-mismatch'
    | 'membership-inactive'
    | 'profile-inactive'
    | 'allowed';
}

/**
 * Fail-closed member access check for the mobile experience.
 * Roles are intentionally not used to expose admin or commercial surfaces.
 */
export function evaluateMobileMemberAccess(
  context: MobileAccessContext,
): MobileAccessDecision {
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  if (context.tenantSlug !== MOBILE_TENANT_SLUG) {
    return { allowed: false, reason: 'tenant-mismatch' };
  }
  if (!context.membershipActive) {
    return { allowed: false, reason: 'membership-inactive' };
  }
  if (context.profileStatus !== 'active') {
    return { allowed: false, reason: 'profile-inactive' };
  }
  return { allowed: true, reason: 'allowed' };
}

