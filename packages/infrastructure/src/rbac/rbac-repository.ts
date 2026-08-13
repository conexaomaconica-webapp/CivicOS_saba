// ============================================================================
// RBAC Repository — INF-004
// ============================================================================
// Persistence contract and PostgreSQL implementation for the runtime RBAC
// layer, aligned with migration 002_identity_authorization_rbac.sql.
// Queries run through the service-role SQL path (RLS bypassed by service_role)
// and mirror the semantics of the SECURITY DEFINER helpers
// (`has_tenant_admin_access`, `has_business_permission`).
// ============================================================================

import type { DatabaseClient } from '../database/database-client';
import type {
  RbacElevatedSession,
  RbacElevatedSessionCreate,
  RbacElevatedSessionUpdate,
  RbacPermission,
  RbacRole,
  RbacRoleCreate,
  RbacRoleUpdate,
  RbacUserRole,
  UserRoleStatus,
} from './rbac-types';

export interface RbacRepository {
  // -- Permissions -----------------------------------------------------------
  listPermissions(): Promise<RbacPermission[]>;

  // -- Roles -----------------------------------------------------------------
  getRoleById(roleId: string): Promise<RbacRole | null>;
  getRoleByCode(tenantId: string | null, code: string): Promise<RbacRole | null>;
  listRoles(tenantId: string | null): Promise<RbacRole[]>;
  createRole(input: RbacRoleCreate): Promise<RbacRole>;
  updateRole(roleId: string, input: RbacRoleUpdate): Promise<RbacRole | null>;
  deleteRole(roleId: string): Promise<boolean>;
  setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void>;

  // -- Assignments -----------------------------------------------------------
  assignRole(tenantId: string, userId: string, roleId: string, assignedBy?: string): Promise<void>;
  removeRole(tenantId: string, userId: string, roleId: string): Promise<void>;
  listUserRoles(tenantId: string, userId: string): Promise<RbacUserRole[]>;
  /** Active tenant-scoped role codes for a user within a tenant. */
  getActiveRoleCodesForUser(tenantId: string, userId: string): Promise<string[]>;
  /** Active global role codes for a user (is_global roles). */
  getGlobalRoleCodesForUser(userId: string): Promise<string[]>;
  /** Platform role from `profiles.role` (e.g. 'master'). */
  getPlatformRoleForUser(userId: string): Promise<string | null>;
  /** Distinct permission codes reachable by the user in the tenant context. */
  listUserPermissionCodes(tenantId: string, userId: string): Promise<string[]>;
  /** Active `business_members.role` for a user on a business. */
  getBusinessMemberRole(tenantId: string, businessId: string, userId: string): Promise<string | null>;

  // -- Elevated sessions -----------------------------------------------------
  createElevatedSession(input: RbacElevatedSessionCreate): Promise<RbacElevatedSession>;
  getElevatedSessionById(id: string): Promise<RbacElevatedSession | null>;
  listActiveElevatedSessions(userId: string): Promise<RbacElevatedSession[]>;
  updateElevatedSession(update: RbacElevatedSessionUpdate): Promise<RbacElevatedSession | null>;
}

// ---------------------------------------------------------------------------
// PostgreSQL implementation
// ---------------------------------------------------------------------------

interface RoleRow {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_global: boolean;
  role_type: string;
}

interface PermissionCodeRow {
  code: string;
}

interface UserRoleRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  status: UserRoleStatus;
  expires_at?: string;
  assigned_at: string;
  role_code: string;
  role_name: string;
}

interface ElevatedSessionRow {
  id: string;
  user_id: string;
  tenant_id?: string;
  business_id?: string;
  reason: string;
  scope: string;
  status: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  expires_at: string;
  revoked_at?: string;
}

export class PostgresRbacRepository implements RbacRepository {
  constructor(private readonly db: DatabaseClient) {}

  // -- Permissions -----------------------------------------------------------

  async listPermissions(): Promise<RbacPermission[]> {
    const rows = await this.db.query<{
      id: string;
      code: string;
      module: string;
      description?: string;
    }>('SELECT id, code, module, description FROM public.permissions ORDER BY code;');

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      module: row.module,
      description: row.description,
    }));
  }

  // -- Roles -----------------------------------------------------------------

  async getRoleById(roleId: string): Promise<RbacRole | null> {
    const rows = await this.db.query<RoleRow>('SELECT * FROM public.roles WHERE id = $1;', [roleId]);
    const row = rows[0];
    if (row === undefined) return null;
    return this.toRole(row, await this.permissionCodesForRole(roleId));
  }

  async getRoleByCode(tenantId: string | null, code: string): Promise<RbacRole | null> {
    const rows = await this.db.query<RoleRow>(
      `SELECT * FROM public.roles
       WHERE code = $1 AND (tenant_id IS NULL OR tenant_id = $2)
       ORDER BY tenant_id IS NULL
       LIMIT 1;`,
      [code, tenantId],
    );
    const row = rows[0];
    if (row === undefined) return null;
    return this.toRole(row, await this.permissionCodesForRole(row.id));
  }

  async listRoles(tenantId: string | null): Promise<RbacRole[]> {
    const rows = tenantId === null
      ? await this.db.query<RoleRow>('SELECT * FROM public.roles WHERE tenant_id IS NULL ORDER BY code;')
      : await this.db.query<RoleRow>(
          'SELECT * FROM public.roles WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY code;',
          [tenantId],
        );

    const roles: RbacRole[] = [];
    for (const row of rows) {
      roles.push(this.toRole(row, await this.permissionCodesForRole(row.id)));
    }
    return roles;
  }

  async createRole(input: RbacRoleCreate): Promise<RbacRole> {
    const rows = await this.db.query<RoleRow>(
      `INSERT INTO public.roles
        (tenant_id, code, name, description, is_system, is_global, role_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        input.tenantId,
        input.code,
        input.name,
        input.description ?? null,
        input.isSystem ?? false,
        input.isGlobal ?? false,
        input.roleType,
      ],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('RBAC: createRole returned no row');

    const permissions = input.permissions ?? [];
    if (permissions.length > 0) {
      await this.setRolePermissions(row.id, permissions);
    }
    return this.toRole(row, permissions);
  }

  async updateRole(roleId: string, input: RbacRoleUpdate): Promise<RbacRole | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.name !== undefined) {
      params.push(input.name);
      sets.push(`name = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      sets.push(`description = $${params.length}`);
    }
    if (sets.length > 0) {
      params.push(roleId);
      await this.db.query(
        `UPDATE public.roles SET ${sets.join(', ')} WHERE id = $${params.length};`,
        params,
      );
    }
    if (input.permissions !== undefined) {
      await this.setRolePermissions(roleId, input.permissions);
    }

    const rows = await this.db.query<RoleRow>('SELECT * FROM public.roles WHERE id = $1;', [roleId]);
    const row = rows[0];
    if (row === undefined) return null;
    return this.toRole(row, await this.permissionCodesForRole(roleId));
  }

  async deleteRole(roleId: string): Promise<boolean> {
    const rows = await this.db.query<{ deleted: boolean }>(
      'DELETE FROM public.roles WHERE id = $1 RETURNING true AS deleted;',
      [roleId],
    );
    return (rows[0]?.deleted ?? false) === true;
  }

  async setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
    await this.db.query('DELETE FROM public.role_permissions WHERE role_id = $1;', [roleId]);
    if (permissionCodes.length === 0) return;

    const params: unknown[] = [roleId];
    const values = permissionCodes
      .map((code, index) => {
        params.push(code);
        return `($1, (SELECT id FROM public.permissions WHERE code = $${index + 2}))`;
      })
      .join(', ');
    await this.db.query(
      `INSERT INTO public.role_permissions (role_id, permission_id)
       VALUES ${values}
       ON CONFLICT DO NOTHING;`,
      params,
    );
  }

  // -- Assignments -----------------------------------------------------------

  async assignRole(tenantId: string, userId: string, roleId: string, assignedBy?: string): Promise<void> {
    await this.db.query(
      `INSERT INTO public.user_roles (tenant_id, user_id, role_id, status, assigned_by)
       VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (tenant_id, user_id, role_id)
       DO UPDATE SET status = 'active', expires_at = NULL;`,
      [tenantId, userId, roleId, assignedBy ?? null],
    );
  }

  async removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    await this.db.query(
      `UPDATE public.user_roles
       SET status = 'revoked'
       WHERE tenant_id = $1 AND user_id = $2 AND role_id = $3;`,
      [tenantId, userId, roleId],
    );
  }

  async listUserRoles(tenantId: string, userId: string): Promise<RbacUserRole[]> {
    const rows = await this.db.query<UserRoleRow>(
      `SELECT ur.id, ur.tenant_id, ur.user_id, ur.role_id, ur.status, ur.expires_at,
              ur.assigned_at, r.code AS role_code, r.name AS role_name
       FROM public.user_roles ur
       JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.tenant_id = $1 AND ur.user_id = $2
       ORDER BY ur.assigned_at DESC;`,
      [tenantId, userId],
    );

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      roleId: row.role_id,
      roleCode: row.role_code,
      roleName: row.role_name,
      status: row.status,
      expiresAt: row.expires_at,
      assignedAt: row.assigned_at,
    }));
  }

  async getActiveRoleCodesForUser(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.db.query<PermissionCodeRow>(
      `SELECT DISTINCT r.code
       FROM public.user_roles ur
       JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.tenant_id = $1 AND ur.user_id = $2 AND ur.status = 'active'
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW());`,
      [tenantId, userId],
    );
    return rows.map((row) => row.code);
  }

  async getGlobalRoleCodesForUser(userId: string): Promise<string[]> {
    const rows = await this.db.query<PermissionCodeRow>(
      `SELECT DISTINCT r.code
       FROM public.user_roles ur
       JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.status = 'active'
         AND (ur.tenant_id IS NULL OR r.is_global = true)
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW());`,
      [userId],
    );
    return rows.map((row) => row.code);
  }

  async getPlatformRoleForUser(userId: string): Promise<string | null> {
    const rows = await this.db.query<{ role: string | null }>(
      'SELECT role FROM public.profiles WHERE id = $1 LIMIT 1;',
      [userId],
    );
    return rows[0]?.role ?? null;
  }

  async listUserPermissionCodes(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.db.query<PermissionCodeRow>(
      `SELECT DISTINCT p.code
       FROM public.user_roles ur
       JOIN public.roles r ON r.id = ur.role_id
       JOIN public.role_permissions rp ON rp.role_id = r.id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $2 AND ur.status = 'active'
         AND (ur.tenant_id = $1 OR r.is_global = true)
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW());`,
      [tenantId, userId],
    );
    return rows.map((row) => row.code);
  }

  async getBusinessMemberRole(tenantId: string, businessId: string, userId: string): Promise<string | null> {
    const rows = await this.db.query<{ role: string }>(
      `SELECT role FROM public.business_members
       WHERE tenant_id = $1 AND business_id = $2 AND user_id = $3 AND status = 'active'
       LIMIT 1;`,
      [tenantId, businessId, userId],
    );
    return rows[0]?.role ?? null;
  }

  // -- Elevated sessions -----------------------------------------------------

  async createElevatedSession(input: RbacElevatedSessionCreate): Promise<RbacElevatedSession> {
    const rows = await this.db.query<ElevatedSessionRow>(
      `INSERT INTO public.elevated_access_sessions
        (user_id, tenant_id, business_id, reason, scope, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING *;`,
      [input.userId, input.tenantId ?? null, input.businessId ?? null, input.reason, input.scope, input.expiresAt],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('RBAC: createElevatedSession returned no row');
    return this.toSession(row);
  }

  async getElevatedSessionById(id: string): Promise<RbacElevatedSession | null> {
    const rows = await this.db.query<ElevatedSessionRow>(
      'SELECT * FROM public.elevated_access_sessions WHERE id = $1;',
      [id],
    );
    const row = rows[0];
    return row === undefined ? null : this.toSession(row);
  }

  async listActiveElevatedSessions(userId: string): Promise<RbacElevatedSession[]> {
    const rows = await this.db.query<ElevatedSessionRow>(
      `SELECT * FROM public.elevated_access_sessions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY requested_at DESC;`,
      [userId],
    );
    return rows.map((row) => this.toSession(row));
  }

  async updateElevatedSession(update: RbacElevatedSessionUpdate): Promise<RbacElevatedSession | null> {
    const rows = await this.db.query<ElevatedSessionRow>(
      `UPDATE public.elevated_access_sessions
       SET status = $2,
           approved_by = COALESCE($3, approved_by),
           approved_at = COALESCE($4, approved_at),
           revoked_at = COALESCE($5, revoked_at)
       WHERE id = $1
       RETURNING *;`,
      [update.id, update.status, update.approvedBy ?? null, update.approvedAt ?? null, update.revokedAt ?? null],
    );
    const row = rows[0];
    return row === undefined ? null : this.toSession(row);
  }

  // -- Mappers ---------------------------------------------------------------

  private async permissionCodesForRole(roleId: string): Promise<string[]> {
    const rows = await this.db.query<PermissionCodeRow>(
      `SELECT p.code
       FROM public.role_permissions rp
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.code;`,
      [roleId],
    );
    return rows.map((row) => row.code);
  }

  private toRole(row: RoleRow, permissions: string[]): RbacRole {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isSystem: row.is_system,
      isGlobal: row.is_global,
      roleType: row.role_type as RbacRole['roleType'],
      permissions,
    };
  }

  private toSession(row: ElevatedSessionRow): RbacElevatedSession {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id ?? undefined,
      businessId: row.business_id ?? undefined,
      reason: row.reason,
      scope: row.scope as RbacElevatedSession['scope'],
      status: row.status as RbacElevatedSession['status'],
      requestedAt: row.requested_at,
      approvedBy: row.approved_by ?? undefined,
      approvedAt: row.approved_at ?? undefined,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at ?? undefined,
    };
  }
}
