// ============================================================================
// RBAC Service — INF-004 (Runtime RBAC)
// ============================================================================
// Runtime authorization service implementing the core `RBACProvider` contract
// and the elevated-access workflow with the Anti-Self-Approval rule:
// the session requester CANNOT approve their own elevated-access session
// (migration 002 "approver can approve elevated_access_sessions" +
// defense-in-depth at runtime).
//
// Mirrors the SECURITY DEFINER helpers (`has_tenant_admin_access`,
// `has_business_permission`) at service level through `hasTenantRole`/
// `hasBusinessPermission`.
// ============================================================================

import type { CreateRoleInput, Permission, RBACProvider, Role } from '@saas/core';
import type { RbacRepository } from './rbac-repository';
import type {
  ElevatedAccessScope,
  RbacElevatedSession,
  RbacElevatedSessionCreate,
} from './rbac-types';

export class RbacError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'session_not_found'
      | 'self_approval_forbidden'
      | 'approver_not_authorized'
      | 'session_not_active'
      | 'session_expired'
      | 'role_not_found',
  ) {
    super(message);
    this.name = 'RbacError';
  }
}

/** Tenant roles with tenant-admin authority (mirrors `has_tenant_admin_access`). */
const TENANT_ADMIN_CODES = ['tenant_admin', 'admin', 'owner', 'socio_admin'] as const;

function slugifyRoleCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
}

export class RbacService implements RBACProvider {
  private readonly permissionRegistry = new Map<string, Permission>();

  constructor(private readonly repository: RbacRepository, private readonly now: () => Date = () => new Date()) {}

  // -- Permission registry (from plugin manifests) ----------------------------

  registerPermissions(permissions: Permission[]): void {
    for (const permission of permissions) {
      this.permissionRegistry.set(permission.key, permission);
    }
  }

  getAllPermissions(): Permission[] {
    return [...this.permissionRegistry.values()];
  }

  getPermissionsByPlugin(pluginId: string): Permission[] {
    return [...this.permissionRegistry.values()].filter((p) => p.pluginId === pluginId);
  }

  // -- Role management ----------------------------------------------------------

  async createRole(tenantId: string, data: CreateRoleInput): Promise<Role> {
    const code = slugifyRoleCode(data.name);
    const role = await this.repository.createRole({
      tenantId,
      code,
      name: data.name,
      description: data.description,
      roleType: 'tenant',
      permissions: data.permissions,
    });
    return this.toCoreRole(role);
  }

  async updateRole(roleId: string, data: Partial<CreateRoleInput>): Promise<Role> {
    const role = await this.repository.updateRole(roleId, data);
    if (role === null) throw new RbacError(`Role ${roleId} not found`, 'role_not_found');
    return this.toCoreRole(role);
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.repository.deleteRole(roleId);
  }

  async getRoles(tenantId: string): Promise<Role[]> {
    const roles = await this.repository.listRoles(tenantId);
    return roles.map((role) => this.toCoreRole(role));
  }

  // -- Assignment -----------------------------------------------------------------

  async assignRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    await this.repository.assignRole(tenantId, userId, roleId);
  }

  async removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    await this.repository.removeRole(tenantId, userId, roleId);
  }

  async getUserRoles(tenantId: string, userId: string): Promise<Role[]> {
    const assignments = await this.repository.listUserRoles(tenantId, userId);
    const roles: Role[] = [];
    for (const assignment of assignments) {
      const role = await this.repository.getRoleById(assignment.roleId);
      if (role !== null) roles.push(this.toCoreRole(role));
    }
    return roles;
  }

  // -- Authorization checks --------------------------------------------------------

  /** True when the user holds the given role within the tenant (or a global role). */
  async hasTenantRole(tenantId: string, roleCode: string, userId: string): Promise<boolean> {
    if (await this.isMaster(userId)) return true;
    const tenantCodes = await this.repository.getActiveRoleCodesForUser(tenantId, userId);
    if (tenantCodes.includes(roleCode)) return true;
    const globalCodes = await this.repository.getGlobalRoleCodesForUser(userId);
    return globalCodes.includes(roleCode);
  }

  /** Tenant-admin authority for the tenant (mirrors `has_tenant_admin_access`). */
  async hasTenantAdmin(tenantId: string, userId: string): Promise<boolean> {
    if (await this.isMaster(userId)) return true;
    const codes = await this.repository.getActiveRoleCodesForUser(tenantId, userId);
    return TENANT_ADMIN_CODES.some((code) => codes.includes(code));
  }

  /** True when the user holds any of the given roles on the business (mirrors `has_business_permission`). */
  async hasBusinessPermission(tenantId: string, businessId: string, roles: string[], userId: string): Promise<boolean> {
    if (await this.hasTenantAdmin(tenantId, userId)) return true;
    const memberRole = await this.repository.getBusinessMemberRole(tenantId, businessId, userId);
    return memberRole !== null && roles.includes(memberRole);
  }

  async hasPermission(tenantId: string, userId: string, permissionKey: string): Promise<boolean> {
    if (await this.isMaster(userId)) return true;
    const codes = await this.repository.listUserPermissionCodes(tenantId, userId);
    return codes.includes(permissionKey);
  }

  async hasAllPermissions(tenantId: string, userId: string, permissionKeys: string[]): Promise<boolean> {
    if (permissionKeys.length === 0) return true;
    if (await this.isMaster(userId)) return true;
    const codes = await this.repository.listUserPermissionCodes(tenantId, userId);
    return permissionKeys.every((key) => codes.includes(key));
  }

  async hasAnyPermission(tenantId: string, userId: string, permissionKeys: string[]): Promise<boolean> {
    if (permissionKeys.length === 0) return false;
    if (await this.isMaster(userId)) return true;
    const codes = await this.repository.listUserPermissionCodes(tenantId, userId);
    return permissionKeys.some((key) => codes.includes(key));
  }

  // -- Elevated access sessions -----------------------------------------------------

  /** Opens an elevated-access session. It only becomes functionally active after approval. */
  async requestElevatedAccess(input: RbacElevatedSessionCreate): Promise<RbacElevatedSession> {
    if (input.expiresAt <= this.now().toISOString()) {
      throw new RbacError('Elevated access session expires_at must be in the future', 'session_expired');
    }
    return this.repository.createElevatedSession(input);
  }

  /**
   * Approves an elevated-access session. Enforces Anti-Self-Approval:
   * the requester cannot approve their own session, and only a platform
   * master (or global `master` role) may approve.
   */
  async approveElevatedAccess(sessionId: string, approverUserId: string): Promise<RbacElevatedSession> {
    const session = await this.repository.getElevatedSessionById(sessionId);
    if (session === null) {
      throw new RbacError(`Elevated access session ${sessionId} not found`, 'session_not_found');
    }
    if (session.userId === approverUserId) {
      throw new RbacError('Anti-Self-Approval: the requester cannot approve their own session', 'self_approval_forbidden');
    }
    if (!(await this.isMaster(approverUserId))) {
      throw new RbacError('Only a platform master can approve elevated access sessions', 'approver_not_authorized');
    }
    if (session.status === 'revoked') {
      throw new RbacError('Elevated access session is revoked', 'session_not_active');
    }
    if (session.expiresAt <= this.now().toISOString()) {
      throw new RbacError('Elevated access session is expired', 'session_expired');
    }

    const updated = await this.repository.updateElevatedSession({
      id: sessionId,
      status: 'active',
      approvedBy: approverUserId,
      approvedAt: this.now().toISOString(),
    });
    if (updated === null) {
      throw new RbacError(`Elevated access session ${sessionId} not found`, 'session_not_found');
    }
    return updated;
  }

  /** Revokes an active session (session owner or a platform master). */
  async revokeElevatedAccess(sessionId: string, actorUserId: string): Promise<RbacElevatedSession> {
    const session = await this.repository.getElevatedSessionById(sessionId);
    if (session === null) {
      throw new RbacError(`Elevated access session ${sessionId} not found`, 'session_not_found');
    }
    if (session.userId !== actorUserId && !(await this.isMaster(actorUserId))) {
      throw new RbacError('Not authorized to revoke this elevated access session', 'approver_not_authorized');
    }
    const updated = await this.repository.updateElevatedSession({
      id: sessionId,
      status: 'revoked',
      revokedAt: this.now().toISOString(),
    });
    if (updated === null) {
      throw new RbacError(`Elevated access session ${sessionId} not found`, 'session_not_found');
    }
    return updated;
  }

  /** True when the session is functionally active: approved, not expired, not revoked. */
  isElevatedAccessActive(
    session: RbacElevatedSession,
    scope?: ElevatedAccessScope,
    tenantId?: string,
  ): boolean {
    if (session.status !== 'active') return false;
    if (session.approvedAt === undefined || session.approvedBy === undefined) return false;
    if (session.expiresAt <= this.now().toISOString()) return false;
    if (scope !== undefined && session.scope !== scope) return false;
    if (tenantId !== undefined && session.tenantId !== undefined && session.tenantId !== tenantId) {
      return false;
    }
    return true;
  }

  /** True when the user holds a functionally active elevated session for the scope. */
  async hasElevatedScope(userId: string, scope: ElevatedAccessScope, tenantId?: string): Promise<boolean> {
    const sessions = await this.repository.listActiveElevatedSessions(userId);
    return sessions.some((session) => this.isElevatedAccessActive(session, scope, tenantId));
  }

  // -- Internals ------------------------------------------------------------

  private async isMaster(userId: string): Promise<boolean> {
    const platformRole = await this.repository.getPlatformRoleForUser(userId);
    if (platformRole === 'master') return true;
    const globalCodes = await this.repository.getGlobalRoleCodesForUser(userId);
    return globalCodes.includes('master');
  }

  private toCoreRole(role: {
    id: string;
    tenantId: string | null;
    name: string;
    description?: string;
    isSystem: boolean;
    permissions: string[];
  }): Role {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions,
      isBuiltIn: role.isSystem,
      tenantId: role.tenantId,
    };
  }
}