// ============================================================================
// Resolved License — Capability Platform
// ============================================================================
// Represents a fully evaluated, read-only projection of a tenant's license.
// This is the output of the LicensingEngine and the input to the 
// CapabilityResolver.
//
// INVARIANT: This object is NEVER edited manually. It is a cacheable projection.
// ============================================================================

export interface ResolvedLicense {
  /** The tenant this license belongs to */
  readonly tenantId: string;

  /** Incremental version number to track updates and invalidate caches */
  readonly version: number;

  /** Timestamp of when this projection was evaluated */
  readonly generatedAt: Date;

  /** The flat set of all active capabilities (Plan + Addons + Overrides) */
  readonly capabilities: ReadonlySet<string>;

  /** The numerical limits/quotas for this tenant */
  readonly quotas: Readonly<Record<string, number>>;

  /** Active addons */
  readonly addons: readonly string[];

  /** Optional expiration date for trials or fixed-term licenses */
  readonly expiresAt?: Date;
}
