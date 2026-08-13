import { describe, it, expect, beforeEach } from 'vitest';

import { RbacService, RbacError } from './rbac-service';
import type { RbacRepository } from './rbac-repository';
import type {
  RbacElevatedSession,
  RbacElevatedSessionCreate,
  RbacElevatedSessionUpdate,
  RbacPermission,
  RbacRole,
  RbacRoleCreate,
  RbacRoleUpdate,
  RbacUserRole,
} from './rbac-types';

/** Faithful in-memory implementation of the RbacRepository contract. */
class MemoryRbacRepository implements RbacRepository {
  readonly roles = new Map<string, RbacRole>();
  readonly permissions = new Map<string, RbacPermission>();
  readonly assignments: RbacUserRole[] = [];
  readonly businessMembers = new Map<string, string>();
  readonly sessions = new Map<string, RbacElevatedSession>();
  readonly platformRoles = new Map<string, string>();
  private id = 0;

  private nextId(): string {
    return `id-${++this.id}`;
  }

  // -- Permissions --
  listPermissions(): Promise<RbacPermission[]> {
    return Promise.resolve([...this.permissions.values()]);
  }

  // -- Roles --
  getRoleById(roleId: string): Promise<RbacRole | null> {
    return Promise.resolve(this.roles.get(roleId) ?? null);
  }

  getRoleByCode(tenantId: string | null, code: string): Promise<RbacRole | null> {
    const match = [...this.roles.values()].find(
      (r) => r.code === code && (r.tenantId === tenantId || (tenantId === null ? r.tenantId === null : true)),
    );
    return Promise.resolve(match ?? null);
  }

  listRoles(tenantId: string | null): Promise<RbacRole[]> {
    const roles = [...this.roles.values()].filter((r) => r.tenantId === tenantId || r.tenantId === null);
    return Promise.resolve(roles);
  }

  createRole(input: RbacRoleCreate): Promise<RbacRole> {
    const role: RbacRole = {
      id: this.nextId(),
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      isSystem: input.isSystem ?? false,
      isGlobal: input.isGlobal ?? false,
      roleType: input.roleType,
      permissions: input.permissions ?? [],
    };
    this.roles.set(role.id, role);
    return Promise.resolve(role);
  }

  updateRole(roleId: string, input: RbacRoleUpdate): Promise<RbacRole | null> {
    const role = this.roles.get(roleId);
    if (role === undefined) return Promise.resolve(null);
    if (input.name !== undefined) role.name = input.name;
    if (input.description !== undefined) role.description = input.description;
    if (input.permissions !== undefined) role.permissions = input.permissions;
    return Promise.resolve(role);
  }

  deleteRole(roleId: string): Promise<boolean> {
    return Promise.resolve(this.roles.delete(roleId));
  }

  setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
    const role = this.roles.get(roleId);
    if (role !== undefined) role.permissions = permissionCodes;
    return Promise.resolve();
  }

  // -- Assignments --
  private findAssignment(tenantId: string, userId: string, roleId: string): RbacUserRole | undefined {
    return this.assignments.find((a) => a.tenantId === tenantId && a.userId === userId && a.roleId === roleId);
  }

  assignRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (role === undefined) return Promise.reject(new Error(`role ${roleId} not found`));
    const existing = this.findAssignment(tenantId, userId, roleId);
    if (existing !== undefined) {
      existing.status = 'active';
      existing.expiresAt = undefined;
      return Promise.resolve();
    }
    this.assignments.push({
      id: this.nextId(),
      tenantId,
      userId,
      roleId,
      roleCode: role.code,
      roleName: role.name,
      status: 'active',
      assignedAt: new Date().toISOString(),
    });
    return Promise.resolve();
  }

  removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    const existing = this.findAssignment(tenantId, userId, roleId);
    if (existing !== undefined) existing.status = 'revoked';
    return Promise.resolve();
  }

  listUserRoles(tenantId: string, userId: string): Promise<RbacUserRole[]> {
    const roles = this.assignments.filter((a) => a.tenantId === tenantId && a.userId === userId);
    return Promise.resolve([...roles].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)));
  }

  private activeAssignmentsFor(tenantId: string, userId: string): RbacUserRole[] {
    return this.assignments.filter((a) => {
      if (a.userId !== userId || a.status !== 'active') return false;
      if (a.expiresAt !== undefined && a.expiresAt <= new Date().toISOString()) return false;
      const role = this.roles.get(a.roleId);
      if (role === undefined) return false;
      return a.tenantId === tenantId || role.isGlobal || role.tenantId === null;
    });
  }

  getActiveRoleCodesForUser(tenantId: string, userId: string): Promise<string[]> {
    const codes = this.activeAssignmentsFor(tenantId, userId)
      .filter((a) => a.tenantId === tenantId)
      .map((a) => a.roleCode);
    return Promise.resolve([...new Set(codes)]);
  }

  getGlobalRoleCodesForUser(userId: string): Promise<string[]> {
    const now = new Date().toISOString();
    const codes = this.assignments
      .filter((a) => {
        if (a.userId !== userId || a.status !== 'active') return false;
        if (a.expiresAt !== undefined && a.expiresAt <= now) return false;
        const role = this.roles.get(a.roleId);
        return role !== undefined && (role.isGlobal || role.tenantId === null);
      })
      .map((a) => a.roleCode);
    return Promise.resolve([...new Set(codes)]);
  }

  getPlatformRoleForUser(userId: string): Promise<string | null> {
    return Promise.resolve(this.platformRoles.get(userId) ?? null);
  }

  listUserPermissionCodes(tenantId: string, userId: string): Promise<string[]> {
    const codes = new Set<string>();
    for (const a of this.activeAssignmentsFor(tenantId, userId)) {
      const role = this.roles.get(a.roleId);
      if (role !== undefined) {
        for (const code of role.permissions) codes.add(code);
      }
    }
    return Promise.resolve([...codes]);
  }

  getBusinessMemberRole(tenantId: string, businessId: string, userId: string): Promise<string | null> {
    return Promise.resolve(this.businessMembers.get(`${tenantId}:${businessId}:${userId}`) ?? null);
  }

  // -- Elevated sessions --
  createElevatedSession(input: RbacElevatedSessionCreate): Promise<RbacElevatedSession> {
    const session: RbacElevatedSession = {
      id: this.nextId(),
      userId: input.userId,
      tenantId: input.tenantId,
      businessId: input.businessId,
      reason: input.reason,
      scope: input.scope,
      status: 'active',
      requestedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  getElevatedSessionById(id: string): Promise<RbacElevatedSession | null> {
    return Promise.resolve(this.sessions.get(id) ?? null);
  }

  listActiveElevatedSessions(userId: string): Promise<RbacElevatedSession[]> {
    // Time-based filtering is handled by the service clock (`isElevatedAccessActive`);
    // this in-memory store only tracks the status, keeping tests deterministic.
    const sessions = [...this.sessions.values()].filter((s) => s.userId === userId && s.status === 'active');
    return Promise.resolve(sessions);
  }

  updateElevatedSession(update: RbacElevatedSessionUpdate): Promise<RbacElevatedSession | null> {
    const session = this.sessions.get(update.id);
    if (session === undefined) return Promise.resolve(null);
    session.status = update.status;
    if (update.approvedBy !== undefined) session.approvedBy = update.approvedBy;
    if (update.approvedAt !== undefined) session.approvedAt = update.approvedAt;
    if (update.revokedAt !== undefined) session.revokedAt = update.revokedAt;
    return Promise.resolve(session);
  }
}

describe('RbacService authorization', () => {
  let repo: MemoryRbacRepository;
  let service: RbacService;
  let clock: { now: Date };

  beforeEach(() => {
    repo = new MemoryRbacRepository();
    clock = { now: new Date('2026-08-11T12:00:00.000Z') };
    service = new RbacService(repo, () => clock.now);
  });

  it('grants permission through role permissions and grant all to master', async () => {
    const role = await repo.createRole({
      tenantId: 'tnt_1',
      code: 'editor',
      name: 'Editor',
      roleType: 'tenant',
      permissions: ['business:update'],
    });
    await repo.assignRole('tnt_1', 'user_1', role.id);

    expect(await service.hasPermission('tnt_1', 'user_1', 'business:update')).toBe(true);
    expect(await service.hasPermission('tnt_1', 'user_1', 'billing:manage')).toBe(false);

    repo.platformRoles.set('user_master', 'master');
    expect(await service.hasPermission('tnt_1', 'user_master', 'anything:at:all')).toBe(true);
  });

  it('supports hasAllPermissions and hasAnyPermission', async () => {
    const role = await repo.createRole({
      tenantId: 'tnt_1',
      code: 'editor',
      name: 'Editor',
      roleType: 'tenant',
      permissions: ['business:update', 'business:view'],
    });
    await repo.assignRole('tnt_1', 'user_1', role.id);

    expect(await service.hasAllPermissions('tnt_1', 'user_1', ['business:view', 'business:update'])).toBe(true);
    expect(await service.hasAllPermissions('tnt_1', 'user_1', ['business:update', 'billing:manage'])).toBe(false);
    expect(await service.hasAnyPermission('tnt_1', 'user_1', ['billing:manage', 'business:update'])).toBe(true);
    expect(await service.hasAnyPermission('tnt_1', 'user_1', [])).toBe(false);
  });

  it('resolves hasTenantRole from tenant roles, global roles and master bypass', async () => {
    const tenantRole = await repo.createRole({ tenantId: 'tnt_1', code: 'moderator', name: 'Moderator', roleType: 'tenant' });
    const globalRole = await repo.createRole({ tenantId: null, code: 'platform_support', name: 'Support', roleType: 'platform', isGlobal: true });
    await repo.assignRole('tnt_1', 'user_1', tenantRole.id);
    await repo.assignRole('tnt_2', 'user_global', globalRole.id);

    expect(await service.hasTenantRole('tnt_1', 'moderator', 'user_1')).toBe(true);
    expect(await service.hasTenantRole('tnt_2', 'moderator', 'user_1')).toBe(false);
    expect(await service.hasTenantRole('tnt_2', 'platform_support', 'user_global')).toBe(true);

    repo.platformRoles.set('user_master', 'master');
    expect(await service.hasTenantRole('tnt_9', 'anything', 'user_master')).toBe(true);
  });

  it('resolves hasBusinessPermission via business membership and tenant admin bypass', async () => {
    repo.businessMembers.set('tnt_1:biz_1:user_staff', 'sales');
    expect(await service.hasBusinessPermission('tnt_1', 'biz_1', ['owner', 'sales'], 'user_staff')).toBe(true);
    expect(await service.hasBusinessPermission('tnt_1', 'biz_1', ['owner'], 'user_staff')).toBe(false);

    const adminRole = await repo.createRole({ tenantId: 'tnt_1', code: 'tenant_admin', name: 'Admin', roleType: 'tenant' });
    await repo.assignRole('tnt_1', 'user_admin', adminRole.id);
    expect(await service.hasBusinessPermission('tnt_1', 'unrelated', ['owner'], 'user_admin')).toBe(true);
  });

  it('returns empty permission set for a user with no roles', async () => {
    expect(await service.hasPermission('tnt_1', 'nobody', 'business:update')).toBe(false);
    expect(await service.hasAllPermissions('tnt_1', 'nobody', [])).toBe(true);
  });
});

describe('RbacService role management', () => {
  let repo: MemoryRbacRepository;
  let service: RbacService;

  beforeEach(() => {
    repo = new MemoryRbacRepository();
    service = new RbacService(repo, () => new Date('2026-08-11T12:00:00.000Z'));
  });

  it('creates a role with a derived code and maps it to the core contract', async () => {
    const role = await service.createRole('tnt_1', {
      name: 'Finance Manager',
      description: 'Manages invoices',
      permissions: ['billing:view'],
    });

    expect(role.id).toBeDefined();
    expect(role.isBuiltIn).toBe(false);
    expect(role.tenantId).toBe('tnt_1');
    expect(role.permissions).toEqual(['billing:view']);

    const stored = await repo.getRoleByCode('tnt_1', 'finance_manager');
    expect(stored?.name).toBe('Finance Manager');
  });

  it('updates, lists and deletes roles', async () => {
    await service.createRole('tnt_1', { name: 'Editor', description: '', permissions: ['business:view'] });

    const roles = await service.getRoles('tnt_1');
    expect(roles).toHaveLength(1);

    const updated = await service.updateRole(roles[0]?.id ?? '', { name: 'Editor II', permissions: ['business:update'] });
    expect(updated.name).toBe('Editor II');
    expect(updated.permissions).toEqual(['business:update']);

    await service.deleteRole(roles[0]?.id ?? '');
    expect(await service.getRoles('tnt_1')).toHaveLength(0);
  });

  it('assigns roles, removes them and lists user roles', async () => {
    const role = await service.createRole('tnt_1', { name: 'Owner', description: '', permissions: [] });
    await service.assignRole('tnt_1', 'user_1', role.id);

    const assigned = await service.getUserRoles('tnt_1', 'user_1');
    expect(assigned).toHaveLength(1);
    expect(assigned[0]?.id).toBe(role.id);

    await service.removeRole('tnt_1', 'user_1', role.id);
    await service.assignRole('tnt_1', 'user_1', role.id); // re-activation via ON CONFLICT
    expect(await service.getUserRoles('tnt_1', 'user_1')).toHaveLength(1);
  });
});

describe('RbacService elevated access (Anti-Self-Approval)', () => {
  let repo: MemoryRbacRepository;
  let service: RbacService;
  let clock: { now: Date };

  beforeEach(() => {
    repo = new MemoryRbacRepository();
    clock = { now: new Date('2026-08-11T12:00:00.000Z') };
    service = new RbacService(repo, () => clock.now);
    repo.platformRoles.set('user_master', 'master');
  });

  const request = (userId = 'requester_1'): Promise<RbacElevatedSession> =>
    service.requestElevatedAccess({
      userId,
      reason: 'Debugging billing issue',
      scope: 'support:elevated_access',
      expiresAt: '2026-08-11T13:00:00.000Z',
    });

  it('is not functionally active before approval', async () => {
    const session = await request();
    expect(service.isElevatedAccessActive(session)).toBe(false);
  });

  it('one master approves and the session becomes active', async () => {
    const session = await request();
    await service.approveElevatedAccess(session.id, 'user_master');

    const refreshed = (await repo.getElevatedSessionById(session.id))!;
    expect(service.isElevatedAccessActive(refreshed)).toBe(true);
    expect(await service.hasElevatedScope('requester_1', 'support:elevated_access')).toBe(true);
  });

  it('forbids the requester from approving their own session (Anti-Self-Approval)', async () => {
    const session = await request();
    repo.platformRoles.set('requester_1', 'master');

    await expect(service.approveElevatedAccess(session.id, 'requester_1')).rejects.toThrow(RbacError);
    await expect(service.approveElevatedAccess(session.id, 'requester_1')).rejects.toMatchObject({
      code: 'self_approval_forbidden',
    });
  });

  it('forbids non-master approvers', async () => {
    const session = await request();
    repo.platformRoles.set('another_operator', 'operator');

    await expect(service.approveElevatedAccess(session.id, 'another_operator')).rejects.toMatchObject({
      code: 'approver_not_authorized',
    });
  });

  it('rejects approval of an expired session', async () => {
    const session = await request();
    clock.now = new Date('2026-08-11T14:00:00.000Z');

    await expect(service.approveElevatedAccess(session.id, 'user_master')).rejects.toMatchObject({
      code: 'session_expired',
    });
  });

  it('revokes a session and it stops granting scope', async () => {
    const session = await request();
    await service.approveElevatedAccess(session.id, 'user_master');
    await service.revokeElevatedAccess(session.id, 'requester_1');

    const refreshed = (await repo.getElevatedSessionById(session.id))!;
    expect(refreshed.status).toBe('revoked');
    expect(service.isElevatedAccessActive(refreshed)).toBe(false);
    expect(await service.hasElevatedScope('requester_1', 'support:elevated_access')).toBe(false);
  });

  it('rejects a request with an already-expired window', async () => {
    await expect(
      service.requestElevatedAccess({
        userId: 'requester_1',
        reason: 'too late',
        scope: 'support:elevated_access',
        expiresAt: '2026-08-11T11:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'session_expired' });
  });
});