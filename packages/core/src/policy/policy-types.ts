// ============================================================================
// Policy Types — Policy Engine (AC-6C)
// ============================================================================

export enum DecisionOutcome {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  ABSTAIN = 'ABSTAIN',
  ERROR = 'ERROR'
}

export interface RuleDecision {
  readonly outcome: DecisionOutcome;
  readonly reason?: string;
  readonly obligations?: string[];
  readonly warnings?: string[];
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly outcome: DecisionOutcome;
  readonly reason: string;
  readonly policyId: string;
  readonly evaluatedAt: Date;
  readonly durationMs: number;
  readonly obligations?: string[];
  readonly warnings?: string[];
}

export interface PolicyContext {
  readonly tenantId: string;
  readonly userId?: string;
  readonly capabilityId?: string;
  readonly resourceId?: string;
  readonly payload?: Record<string, unknown>;
  // Resolved dependencies from EvaluationContextBuilder
  readonly capabilities?: readonly string[];
  readonly permissions?: readonly string[];
  readonly quotas?: Record<string, number>;
  readonly featureFlags?: Record<string, boolean>;
}

export interface PolicyRule {
  readonly id: string;
  readonly type: 'pure' | 'async';
}

export interface PureRule extends PolicyRule {
  readonly type: 'pure';
  evaluate(context: PolicyContext): RuleDecision;
}

export interface AsyncRule extends PolicyRule {
  readonly type: 'async';
  evaluate(context: PolicyContext): Promise<RuleDecision>;
}

export interface PolicyDefinition {
  readonly id: string;
  readonly description?: string;
  readonly priority?: number;
}
