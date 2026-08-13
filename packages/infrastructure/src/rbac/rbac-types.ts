// ============================================================================
// RBAC Runtime Types — INF-004
// ============================================================================
// Types for the runtime RBAC layer, aligned with migration
// 002_identity_authorization_rbac.sql (roles, permissions, role_permissions,
// user_roles, elevated_access_sessions).
//
// INVARIANT: Contains ZERO business logic.
// ============================================================================

export type RbacRoleType = 'platform' | 'operational' | 'tenant';

/** A role row of `public.roles` with its resolved permission codes. */
export interface RbacRole {
  id: string;
  tenantId: string | null;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isGlobal: boolean;
  roleType: RbacRoleType;
  /** Permission codes granted to this role (resolved via role_permissions). */
  permissions: string[];
}

export interface RbacPermission {
  id: string;
  code: string;
  module: string;
  description?: string;
}

export type UserRoleStatus = 'active' | 'suspended' | 'revoked';

/** A row of `public.user_roles` joined with its role. */
export interface RbacUserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  status: UserRoleStatus;
  expiresAt?: string;
  assignedAt: string;
}

// -- Elevated access (Anti-Self-Approval workflow) ----------------------------

export type ElevatedAccessScope =
  | 'support:elevated_access'
  | 'privacy:restricted_data:view'
  | 'financial:cross_tenant:view';

export type ElevatedAccessStatus = 'active' | 'expired' | 'revoked';

/** A row of `public.elevated_access_sessions`. */
export interface RbacElevatedSession {
  id: string;
  userId: string;
  tenantId?: string;
  businessId?: string;
  reason: string;
  scope: ElevatedAccessScope;
  status: ElevatedAccessStatus;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt: string;
  revokedAt?: string;
}

// -- Repository inputs --------------------------------------------------------

export interface RbacRoleCreate {
  tenantId: string | null;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isGlobal?: boolean;
  roleType: RbacRoleType;
  permissions?: string[];
}

export interface RbacRoleUpdate {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface RbacElevatedSessionCreate {
  userId: string;
  tenantId?: string;
  businessId?: string;
  reason: string;
  scope: ElevatedAccessScope;
  expiresAt: string;
}

export interface RbacElevatedSessionUpdate {
  id: string;
  status: ElevatedAccessStatus;
  approvedBy?: string;
  approvedAt?: string;
  revokedAt?: string;
}
