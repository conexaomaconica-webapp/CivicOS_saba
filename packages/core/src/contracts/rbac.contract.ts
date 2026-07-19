// ============================================================================
// RBAC Contract — Core Kernel
// ============================================================================
// Role-Based Access Control interfaces. Plugins register their permissions;
// the Core enforces them via middleware and route guards.
// ============================================================================

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export interface Permission {
  /** Unique permission key, e.g. "billing:invoices:read". */
  readonly key: string;
  /** Human-readable label. */
  readonly label: string;
  /** Description of what this permission grants. */
  readonly description: string;
  /** Plugin that owns this permission. */
  readonly pluginId: string;
  /** Grouping category for UI display. */
  readonly category?: string;
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Permission keys granted to this role. */
  readonly permissions: readonly string[];
  /** Whether this is a built-in role (cannot be deleted). */
  readonly isBuiltIn: boolean;
  /** Tenant that owns this role (null = global/system role). */
  readonly tenantId: string | null;
}

// ---------------------------------------------------------------------------
// RBAC Provider
// ---------------------------------------------------------------------------

export interface RBACProvider {
  // -- Permission Registry --

  /** Register permissions (called by plugins during init). */
  registerPermissions(permissions: Permission[]): void;

  /** Get all registered permissions. */
  getAllPermissions(): Permission[];

  /** Get permissions by plugin. */
  getPermissionsByPlugin(pluginId: string): Permission[];

  // -- Role Management --

  /** Create a custom role for a tenant. */
  createRole(
    tenantId: string,
    data: CreateRoleInput,
  ): Promise<Role>;

  /** Update a role. */
  updateRole(
    roleId: string,
    data: Partial<CreateRoleInput>,
  ): Promise<Role>;

  /** Delete a custom role. */
  deleteRole(roleId: string): Promise<void>;

  /** Get all roles for a tenant (including built-in). */
  getRoles(tenantId: string): Promise<Role[]>;

  // -- Assignment --

  /** Assign a role to a user within a tenant. */
  assignRole(tenantId: string, userId: string, roleId: string): Promise<void>;

  /** Remove a role from a user. */
  removeRole(tenantId: string, userId: string, roleId: string): Promise<void>;

  /** Get all roles assigned to a user within a tenant. */
  getUserRoles(tenantId: string, userId: string): Promise<Role[]>;

  // -- Authorization Checks --

  /** Check if a user has a specific permission within a tenant. */
  hasPermission(
    tenantId: string,
    userId: string,
    permissionKey: string,
  ): Promise<boolean>;

  /** Check if a user has ALL of the given permissions. */
  hasAllPermissions(
    tenantId: string,
    userId: string,
    permissionKeys: string[],
  ): Promise<boolean>;

  /** Check if a user has ANY of the given permissions. */
  hasAnyPermission(
    tenantId: string,
    userId: string,
    permissionKeys: string[],
  ): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface CreateRoleInput {
  readonly name: string;
  readonly description: string;
  readonly permissions: string[];
}
