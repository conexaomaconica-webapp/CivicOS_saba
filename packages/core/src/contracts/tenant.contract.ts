// ============================================================================
// Tenant Contract — Core Kernel
// ============================================================================
// Defines multi-tenancy interfaces. The Core resolves the current tenant
// from the request context; plugins access it via the DI container.
// ============================================================================

// ---------------------------------------------------------------------------
// Tenant Entity
// ---------------------------------------------------------------------------

export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly settings: TenantSettings;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TenantSettings {
  /** Plugins enabled for this tenant. */
  readonly enabledPlugins: readonly string[];
  /** Feature flags. */
  readonly features: Record<string, boolean>;
  /** Branding overrides. */
  readonly branding?: TenantBranding;
  /** Custom configuration per plugin. */
  readonly pluginConfig: Record<string, Record<string, unknown>>;
}

export interface TenantBranding {
  readonly primaryColor?: string;
  readonly logoUrl?: string;
  readonly faviconUrl?: string;
  readonly appName?: string;
}

// ---------------------------------------------------------------------------
// Tenant Context
// ---------------------------------------------------------------------------

/** Immutable tenant context available during a request. */
export interface TenantContext {
  /** Current tenant, or null for unauthenticated requests. */
  readonly tenant: Tenant | null;
  /** Shortcut for tenant.id. */
  readonly tenantId: string | null;
  /** Whether a plugin is enabled for the current tenant. */
  isPluginEnabled(pluginId: string): boolean;
  /** Get plugin-specific config for the current tenant. */
  getPluginConfig<T = Record<string, unknown>>(pluginId: string): T;
}

// ---------------------------------------------------------------------------
// Tenant Resolver
// ---------------------------------------------------------------------------

export type TenantResolutionStrategy =
  | 'subdomain'  // tenant.app.com
  | 'path'       // app.com/tenant
  | 'header'     // X-Tenant-ID header
  | 'cookie'     // tenant_id cookie
  | 'jwt';       // from JWT claims

export interface TenantResolver {
  /** Supported resolution strategies (in priority order). */
  readonly strategies: readonly TenantResolutionStrategy[];

  /** Resolve the tenant from a request. */
  resolve(request: Request): Promise<Tenant | null>;

  /** Get a tenant by ID. */
  getById(id: string): Promise<Tenant | null>;

  /** Get a tenant by slug. */
  getBySlug(slug: string): Promise<Tenant | null>;

  /** Create a new tenant. */
  create(data: CreateTenantInput): Promise<Tenant>;

  /** Update tenant settings. */
  updateSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
  ): Promise<Tenant>;
}

export interface CreateTenantInput {
  readonly name: string;
  readonly slug: string;
  readonly settings?: Partial<TenantSettings>;
}
