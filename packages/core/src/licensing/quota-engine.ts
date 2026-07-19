// ============================================================================
// Quota Engine — Capability Platform
// ============================================================================
// Manages and evaluates numeric limits defined in the ResolvedLicense against
// actual usage tracked by the platform.
// ============================================================================

import type { ResolvedLicense } from './resolved-license';

export interface UsageDataProvider {
  /** Gets current usage for a specific quota key (e.g. 'storage', 'users') */
  getUsage(tenantId: string, quotaKey: string): Promise<number>;
}

export class QuotaEngine {
  constructor(private readonly usageProvider: UsageDataProvider) {}

  /**
   * Calculates how much of a quota is remaining.
   * If the quota is unlimited (often represented by -1 or undefined depending on business logic),
   * it returns Infinity.
   * 
   * @param license The resolved license containing the limits
   * @param quotaKey The key of the quota (e.g., 'storage')
   */
  async quotaRemaining(license: ResolvedLicense, quotaKey: string): Promise<number> {
    const limit = license.quotas[quotaKey];

    // If there is no limit defined, we assume it's 0 (not allowed). 
    // Or it could be treated as unlimited depending on the policy.
    // Given it's a SaaS, strict-by-default is safer.
    if (limit === undefined) {
      return 0;
    }

    // Unlimited limit representation (e.g., -1)
    if (limit === -1) {
      return Infinity;
    }

    const usage = await this.usageProvider.getUsage(license.tenantId, quotaKey);
    const remaining = limit - usage;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Evaluates if a tenant can consume an additional `amount` of a given quota.
   */
  async canConsume(license: ResolvedLicense, quotaKey: string, amount = 1): Promise<boolean> {
    const remaining = await this.quotaRemaining(license, quotaKey);
    return remaining >= amount;
  }
}
