// ============================================================================
// Policy Diagnostics — Policy Engine (AC-6C)
// ============================================================================

import { DecisionOutcome, type PolicyDecision } from './policy-types';

export interface PolicyEngineMetrics {
  totalEvaluations: number;
  totalAllows: number;
  totalDenies: number;
  totalErrors: number;
  totalAbstains: number;
  averageEvaluationTimeMs: number;
  slowPolicies: Set<string>;
  missingPolicies: Set<string>;
}

export class PolicyDiagnostics {
  private metrics: PolicyEngineMetrics = {
    totalEvaluations: 0,
    totalAllows: 0,
    totalDenies: 0,
    totalErrors: 0,
    totalAbstains: 0,
    averageEvaluationTimeMs: 0,
    slowPolicies: new Set(),
    missingPolicies: new Set(),
  };

  private cumulativeTimeMs = 0;

  recordEvaluation(decision: PolicyDecision): void {
    this.metrics.totalEvaluations++;
    this.cumulativeTimeMs += decision.durationMs;
    this.metrics.averageEvaluationTimeMs = this.cumulativeTimeMs / this.metrics.totalEvaluations;

    // Arbitrary threshold for a "slow policy"
    if (decision.durationMs > 500) {
      this.metrics.slowPolicies.add(decision.policyId);
    }

    switch (decision.outcome) {
      case DecisionOutcome.ALLOW:
        this.metrics.totalAllows++;
        break;
      case DecisionOutcome.DENY:
        this.metrics.totalDenies++;
        break;
      case DecisionOutcome.ERROR:
        this.metrics.totalErrors++;
        break;
      case DecisionOutcome.ABSTAIN:
        this.metrics.totalAbstains++;
        break;
    }
  }

  recordMissingPolicy(policyId: string): void {
    this.metrics.missingPolicies.add(policyId);
  }

  getMetrics(): PolicyEngineMetrics {
    return {
      ...this.metrics,
      slowPolicies: new Set(this.metrics.slowPolicies),
      missingPolicies: new Set(this.metrics.missingPolicies)
    };
  }
}
