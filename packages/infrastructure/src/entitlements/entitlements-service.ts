// ============================================================================
// Entitlements Service — INF-005 (Entitlements Core)
// ============================================================================
// Catalogs entitlements, grants them to businesses through traceable sources,
// and enforces quota consumption against the effective value (overrides win,
// then the granted numeric value; `unlimited` has no cap).
// ============================================================================

import type { EntitlementsRepository } from './entitlements-repository';
import type {
  EntitlementConsumption,
  EntitlementDefinition,
  EntitlementDefinitionUpsert,
  EntitlementGrant,
  EntitlementGrantCreate,
  EntitlementGrantStatus,
  EntitlementOverride,
  EntitlementOverrideCreate,
  EntitlementValue,
} from './entitlements-types';

export class EntitlementError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'definition_not_found'
      | 'grant_not_found'
      | 'grant_not_consumable'
      | 'quota_exceeded'
      | 'wrong_value_type'
      | 'amount_invalid',
  ) {
    super(message);
    this.name = 'EntitlementError';
  }
}

interface ConsumeInput {
  tenantId: string;
  businessId: string;
  entitlementCode: string;
  amount: number;
}

export class EntitlementsService {
  constructor(
    private readonly repository: EntitlementsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // -- Definitions -----------------------------------------------------------

  async registerDefinition(input: EntitlementDefinitionUpsert): Promise<EntitlementDefinition> {
    return this.repository.ensureDefinition(input);
  }

  async listDefinitions(): Promise<EntitlementDefinition[]> {
    return this.repository.listDefinitions();
  }

  // -- Grants ----------------------------------------------------------------

  async grant(input: EntitlementGrantCreate): Promise<EntitlementGrant> {
    return this.repository.createGrant(input);
  }

  async revoke(grantId: string, actorUserId?: string, reason?: string): Promise<EntitlementGrant> {
    const grant = await this.setGrantStatus(grantId, 'revoked', actorUserId, reason);
    return grant;
  }

  async suspend(grantId: string, actorUserId?: string, reason?: string): Promise<EntitlementGrant> {
    return this.setGrantStatus(grantId, 'suspended', actorUserId, reason);
  }

  async reactivate(grantId: string, actorUserId?: string, reason?: string): Promise<EntitlementGrant> {
    return this.setGrantStatus(grantId, 'active', actorUserId, reason);
  }

  async listGrantsForBusiness(tenantId: string, businessId: string): Promise<EntitlementGrant[]> {
    return this.repository.listGrantsForBusiness(tenantId, businessId);
  }

  // -- Overrides -------------------------------------------------------------

  /** Applies a manual override to a grant (latest wins on evaluation). */
  applyOverride(input: EntitlementOverrideCreate): Promise<EntitlementOverride> {
    return this.repository.createOverride(input);
  }

  listOverrides(grantId: string): Promise<EntitlementOverride[]> {
    return this.repository.listOverrides(grantId);
  }

  private async setGrantStatus(
    grantId: string,
    status: EntitlementGrantStatus,
    actorUserId?: string,
    reason?: string,
  ): Promise<EntitlementGrant> {
    const updated = await this.repository.updateGrantStatus(grantId, status, actorUserId, reason);
    if (updated === null) throw new EntitlementError(`Grant ${grantId} not found`, 'grant_not_found');
    return updated;
  }

  // -- Evaluation ------------------------------------------------------------

  /** Effective value of an entitlement for a business (overrides win). */
  async getEntitlement(tenantId: string, businessId: string, code: string): Promise<EntitlementValue> {
    const granted = await this.repository.getGrantByCode(tenantId, businessId, code);
    if (granted === null) {
      return { code, granted: false, active: false, valueType: 'boolean', isUnlimited: false };
    }
    return {
      code,
      granted: true,
      active: this.isConsumable(granted),
      valueType: granted.isUnlimited ? 'unlimited' : this.inferValueType(granted),
      valueBoolean: granted.valueBoolean,
      valueNumeric: granted.isUnlimited ? undefined : granted.valueNumeric,
      isUnlimited: granted.isUnlimited,
      validUntil: granted.validUntil,
    };
  }

  /**
   * Consumes `amount` of a numeric entitlement. Returns `allowed: false` (with
   * usage details) instead of throwing when the quota is exhausted.
   */
  async consume(input: ConsumeInput): Promise<EntitlementConsumption> {
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new EntitlementError('Consumption amount must be a non-negative number', 'amount_invalid');
    }

    const grant = await this.repository.getGrantByCode(input.tenantId, input.businessId, input.entitlementCode);
    if (grant === null) throw new EntitlementError('Grant not found', 'grant_not_found');
    if (!this.isConsumable(grant)) throw new EntitlementError('Grant is not consumable', 'grant_not_consumable');
    if (grant.isUnlimited) {
      const usage = await this.repository.upsertUsage(grant.id, input.businessId, 0);
      return {
        allowed: true,
        code: input.entitlementCode,
        currentUsage: usage.currentUsage,
        limit: null,
        remaining: null,
      };
    }

    const limit = await this.effectiveNumericValue(grant);
    if (limit === null) {
      throw new EntitlementError(
        `Grant '${input.entitlementCode}' has no numeric value to consume`,
        'wrong_value_type',
      );
    }

    const current = (await this.repository.getUsage(grant.id, input.businessId))?.currentUsage ?? 0;
    if (current + input.amount > limit) {
      return {
        allowed: false,
        code: input.entitlementCode,
        currentUsage: current,
        limit,
        remaining: Math.max(0, limit - current),
      };
    }

    const usage = await this.repository.upsertUsage(grant.id, input.businessId, current + input.amount);
    return {
      allowed: true,
      code: input.entitlementCode,
      currentUsage: usage.currentUsage,
      limit,
      remaining: limit - usage.currentUsage,
    };
  }

  // -- Internals -------------------------------------------------------------

  private isConsumable(grant: EntitlementGrant): boolean {
    if (grant.status !== 'active') return false;
    const nowIso = this.now().toISOString();
    if (grant.validFrom > nowIso) return false;
    if (grant.validUntil !== undefined && grant.validUntil <= nowIso) return false;
    return true;
  }

  /** Numeric effective value of the grant. The latest override wins over the granted value. */
  private async effectiveNumericValue(grant: EntitlementGrant): Promise<number | null> {
    const grantedValue = grant.valueNumeric;
    if (grantedValue === undefined || grantedValue === null) return null;

    const overrides = await this.repository.listOverrides(grant.id);
    const latest = overrides[0];
    const limit = latest?.overrideValueNumeric ?? grantedValue;
    return limit < 0 ? 0 : limit;
  }

  private inferValueType(grant: EntitlementGrant): 'boolean' | 'numeric' {
    return grant.valueNumeric !== undefined ? 'numeric' : 'boolean';
  }
}