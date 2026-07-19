// ============================================================================
// Licensing Engine — Capability Platform
// ============================================================================
// Resolves a tenant's raw subscription data into a definitive ResolvedLicense.
// It acts as the factory for ResolvedLicense objects.
// ============================================================================

import { ResolvedLicense } from './resolved-license';

export interface LicensePlan {
  readonly id: string;
  readonly capabilities: string[];
  readonly quotas: Record<string, number>;
}

export interface LicenseAddon {
  readonly id: string;
  readonly capabilities: string[];
  readonly quotas: Record<string, number>;
}

export interface TenantSubscription {
  readonly tenantId: string;
  readonly planId: string;
  readonly addonIds: string[];
  readonly status: 'active' | 'past_due' | 'canceled' | 'trialing';
  readonly expiresAt?: Date;
}

export interface TenantOverrides {
  readonly tenantId: string;
  readonly grantedCapabilities: string[];
  readonly revokedCapabilities: string[];
  readonly quotaOverrides: Record<string, number>;
}

export interface LicenseDataProvider {
  getPlan(planId: string): Promise<LicensePlan | null>;
  getAddon(addonId: string): Promise<LicenseAddon | null>;
  getTenantSubscription(tenantId: string): Promise<TenantSubscription | null>;
  getTenantOverrides(tenantId: string): Promise<TenantOverrides | null>;
}

export class LicensingEngine {
  constructor(private readonly provider: LicenseDataProvider) {}

  /**
   * Resolves the definitive license state for a tenant.
   * This is where Plan + Addons + Overrides are merged.
   */
  async resolve(tenantId: string): Promise<ResolvedLicense> {
    const subscription = await this.provider.getTenantSubscription(tenantId);
    
    // If no active subscription is found, we might want to fallback to a FREE plan
    // or throw an error depending on business rules. 
    // The constitution recommends Graceful Degradation (Fallback to STARTER).
    const planId = subscription?.planId || 'starter';
    const plan = await this.provider.getPlan(planId);
    
    if (!plan) {
      throw new Error(`Critical: Base plan "${planId}" not found in catalog.`);
    }

    const capabilities = new Set<string>(plan.capabilities);
    const quotas: Record<string, number> = { ...plan.quotas };
    const addons: string[] = [];

    // Addons
    if (subscription?.addonIds) {
      for (const addonId of subscription.addonIds) {
        const addon = await this.provider.getAddon(addonId);
        if (addon) {
          addons.push(addon.id);
          for (const cap of addon.capabilities) {
            capabilities.add(cap);
          }
          for (const [key, val] of Object.entries(addon.quotas)) {
            // Addon quotas usually add up to the base plan quotas, 
            // but for simplicity we could replace or sum.
            // A logical default is to sum numerical quotas.
            quotas[key] = (quotas[key] || 0) + val;
          }
        }
      }
    }

    // Overrides
    const overrides = await this.provider.getTenantOverrides(tenantId);
    if (overrides) {
      // 1. Grants
      for (const cap of overrides.grantedCapabilities) {
        capabilities.add(cap);
      }
      // 2. Revokes
      for (const cap of overrides.revokedCapabilities) {
        capabilities.delete(cap);
      }
      // 3. Quota Overrides (replace)
      for (const [key, val] of Object.entries(overrides.quotaOverrides)) {
        quotas[key] = val;
      }
    }

    // If subscription is canceled or expired, we might strip premium capabilities
    // Graceful degradation:
    if (subscription?.status === 'canceled') {
      // Fallback logic could be handled here or by emitting an event.
      // For now, we trust the DB subscription state.
    }

    return {
      tenantId,
      version: Date.now(), // Unique version for cache invalidation
      generatedAt: new Date(),
      capabilities,
      quotas,
      addons,
      expiresAt: subscription?.expiresAt,
    };
  }
}
