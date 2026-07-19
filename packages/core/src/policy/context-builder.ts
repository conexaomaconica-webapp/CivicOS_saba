// ============================================================================
// Evaluation Context Builder — Policy Engine (AC-6C)
// ============================================================================

import type { PolicyContext } from './policy-types';


export interface QuotaService {
  getQuotas(tenantId: string): Promise<Record<string, number>>;
}

export interface FeatureFlagService {
  getFlags(tenantId: string): Promise<Record<string, boolean>>;
}

export class EvaluationContextBuilder {
  constructor(
    private readonly capabilityEvaluator: any,
    private readonly permissionEvaluator: any,
    // In a real scenario, these would be injected dependencies
    private readonly quotaService?: QuotaService,
    private readonly featureFlagService?: FeatureFlagService
  ) {}

  /**
   * Prepares a rich, immutable context for Policy evaluation.
   */
  async buildContext(baseContext: PolicyContext): Promise<PolicyContext> {
    const { tenantId, userId } = baseContext;

    // 1. Resolve Capabilities (Mocked for AC-6C)
    // In a real system, we'd fetch all capabilities for the tenant
    const capabilities: string[] = baseContext.capabilityId 
      ? (this.capabilityEvaluator.hasCapability(baseContext) ? [baseContext.capabilityId] : [])
      : [];

    // 2. Resolve Permissions (Mocked for AC-6C)
    const permissions: string[] = userId && baseContext.capabilityId
      ? (this.permissionEvaluator.hasPermission(baseContext) ? ['execute'] : [])
      : [];

    // 3. Fetch async context (Quotas, Flags)
    const quotas = this.quotaService ? await this.quotaService.getQuotas(tenantId) : {};
    const featureFlags = this.featureFlagService ? await this.featureFlagService.getFlags(tenantId) : {};

    const richContext: PolicyContext = {
      ...baseContext,
      capabilities,
      permissions,
      quotas,
      featureFlags
    };

    // Deep freeze the context to guarantee immutability (Rules should be pure functions over this context)
    return this.deepFreeze(richContext);
  }

  private deepFreeze<T extends Record<string, any>>(obj: T): T {
    Object.keys(obj).forEach((prop) => {
      const propValue = obj[prop];
      if (propValue && typeof propValue === 'object' && !Object.isFrozen(propValue)) {
        this.deepFreeze(propValue);
      }
    });
    return Object.freeze(obj);
  }
}
