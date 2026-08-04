// ============================================================================
// Licensing Contract — Core Kernel
// ============================================================================
// Enforces limits (users, storage, banners, etc.) and active modules per tenant.
// Handled separately from Billing to keep the domain clean.
// ============================================================================

export interface LicenseLimits {
  readonly maxUsers?: number;
  readonly maxStorageBytes?: number;
  readonly maxBanners?: number;
  readonly maxListings?: number; // For business directories
  readonly maxEvents?: number;
  readonly aiFeaturesEnabled?: boolean;
  readonly importerEnabled?: boolean;
  /** Custom domain/product limits. Specific commercial limits are resolved via Entitlements Engine. */
  readonly customLimits?: Readonly<Record<string, number>>;
}

export interface LicensingService {
  /** Check if a module is licensed and active for the tenant. */
  isModuleActive(tenantId: string, moduleId: string): Promise<boolean>;

  /** Get resource limits for a tenant. */
  getLimits(tenantId: string): Promise<LicenseLimits>;

  /** Verify if a tenant can consume a specific resource limit. */
  checkLimit(
    tenantId: string,
    limitKey: keyof LicenseLimits,
    currentCount: number,
  ): Promise<{ allowed: boolean; max: number | boolean }>;
}
