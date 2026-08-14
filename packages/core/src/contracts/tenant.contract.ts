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
  /** Primary brand color (hex, e.g. `#1E3A8A`). Generates the full OKLCH scale. */
  readonly primaryColor?: string;
  /** Optional accent color (hex). Falls back to the primary scale when absent. */
  readonly accentColor?: string;
  /** Brand logo URL. */
  readonly logoUrl?: string;
  /** Favicon URL. */
  readonly faviconUrl?: string;
  /** Brand app/product name. */
  readonly appName?: string;
  /** Brand font family stack, overrides `--font-sans`. */
  readonly fontFamily?: string;
  /** Border radius scale preset. */
  readonly radius?: 'sm' | 'md' | 'lg' | 'xl';
  /** UI density preset. */
  readonly density?: 'comfortable' | 'compact';
  /** Color mode applied at the root element. `auto` defers to the visitor. */
  readonly colorMode?: 'light' | 'dark' | 'auto';
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
