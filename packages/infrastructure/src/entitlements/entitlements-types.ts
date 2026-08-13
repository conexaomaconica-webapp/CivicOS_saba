// ============================================================================
// Entitlements Runtime Types — INF-005
// ============================================================================
// Types for the entitlements core, aligned with migration
// 013_entitlements_engine.sql (entitlement_definitions, entitlement_sources,
// entitlement_grants, entitlement_usage, entitlement_overrides).
//
// INVARIANT: Contains ZERO business logic.
// ============================================================================

export type EntitlementValueType = 'boolean' | 'numeric' | 'unlimited';

/** A row of `public.entitlement_definitions` — the rights catalog. */
export interface EntitlementDefinition {
  id: string;
  code: string;
  name: string;
  valueType: EntitlementValueType;
  description?: string;
}

export type EntitlementSourceType =
  | 'plan_version'
  | 'founder_qualification'
  | 'campaign'
  | 'manual_override';

/** A row of `public.entitlement_sources` — traceable origin of a grant. */
export interface EntitlementSource {
  id: string;
  tenantId: string;
  sourceType: EntitlementSourceType;
  sourceReferenceId: string;
  sourceMetadata: Record<string, unknown>;
}

export type EntitlementGrantStatus = 'active' | 'suspended' | 'expired' | 'revoked';

/** A row of `public.entitlement_grants` (joined with its definition). */
export interface EntitlementGrant {
  id: string;
  tenantId: string;
  businessId: string;
  entitlementId: string;
  entitlementCode: string;
  entitlementName: string;
  sourceId: string;
  status: EntitlementGrantStatus;
  valueBoolean?: boolean;
  valueNumeric?: number;
  isUnlimited: boolean;
  validFrom: string;
  validUntil?: string;
  grantedBy?: string;
  revokedAt?: string;
  revokedBy?: string;
  reason?: string;
}

/** A row of `public.entitlement_usage`. */
export interface EntitlementUsage {
  grantId: string;
  businessId: string;
  currentUsage: number;
  lastUsedAt: string;
}

/** A row of `public.entitlement_overrides` (latest wins). */
export interface EntitlementOverride {
  id: string;
  grantId: string;
  overrideValueNumeric?: number;
  overrideValueBoolean?: boolean;
  reason: string;
  authorizedBy: string;
  createdAt: string;
}

// -- Repository inputs --------------------------------------------------------

export interface EntitlementDefinitionUpsert {
  code: string;
  name: string;
  valueType: EntitlementValueType;
  description?: string;
}

export interface EntitlementSourceCreate {
  tenantId: string;
  sourceType: EntitlementSourceType;
  sourceReferenceId: string;
  sourceMetadata?: Record<string, unknown>;
}

export interface EntitlementGrantCreate {
  tenantId: string;
  businessId: string;
  entitlementCode: string;
  sourceType: EntitlementSourceType;
  sourceReferenceId: string;
  sourceMetadata?: Record<string, unknown>;
  valueBoolean?: boolean;
  valueNumeric?: number;
  isUnlimited?: boolean;
  validUntil?: string;
  grantedBy?: string;
  reason?: string;
}

export interface EntitlementOverrideCreate {
  grantId: string;
  overrideValueNumeric?: number;
  overrideValueBoolean?: boolean;
  reason: string;
  authorizedBy: string;
}

// -- Service results ----------------------------------------------------------

export interface EntitlementValue {
  code: string;
  granted: boolean;
  active: boolean;
  valueType: EntitlementValueType;
  valueBoolean?: boolean;
  valueNumeric?: number;
  isUnlimited: boolean;
  validUntil?: string;
}

export interface EntitlementConsumption {
  allowed: boolean;
  code: string;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
}