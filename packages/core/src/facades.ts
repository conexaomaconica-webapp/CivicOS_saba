import type { PolicyContext, PolicyDecision } from './policy/policy-types';

import type { JobDefinition } from './execution/job-runtime';
import type { PresentationContext } from './presentation/presentation-types';

export interface PolicyEngine {
  evaluate(policyId: string, context: PolicyContext): Promise<PolicyDecision>;
}

export interface WorkflowRuntime {
  start(): void;
  // future methods for introspection
}

export interface ExecutionRuntime {
  enqueue<T>(job: JobDefinition<T>, payload: T): Promise<string>;
}

export interface CapabilityPlatform {
  hasCapability(tenantContext: PresentationContext, capabilityId: string): boolean;
  getLicenseForTenant(tenantId: string): any; // future
}
