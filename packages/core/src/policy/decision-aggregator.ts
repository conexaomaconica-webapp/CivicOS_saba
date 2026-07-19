// ============================================================================
// Decision Aggregator — Policy Engine (AC-6C)
// ============================================================================

import { DecisionOutcome, type PolicyDecision, type RuleDecision } from './policy-types';

export class DecisionAggregator {
  /**
   * Aggregates multiple RuleDecisions into a final PolicyDecision.
   * Strategy (Extended Deny Overrides): ERROR > DENY > ALLOW > ABSTAIN
   */
  static aggregate(policyId: string, ruleDecisions: { ruleId: string; decision: RuleDecision }[], durationMs: number): PolicyDecision {
    let finalOutcome = DecisionOutcome.ABSTAIN;
    let finalReason = 'No rules evaluated or all abstained.';
    let overrideReason = '';
    const allObligations: string[] = [];
    const allWarnings: string[] = [];

    for (const { ruleId, decision } of ruleDecisions) {
      if (decision.obligations) allObligations.push(...decision.obligations);
      if (decision.warnings) allWarnings.push(...decision.warnings);

      if (decision.outcome === DecisionOutcome.ERROR && finalOutcome !== DecisionOutcome.ERROR) {
        finalOutcome = DecisionOutcome.ERROR;
        overrideReason = `Rule [${ruleId}] encountered an error: ${decision.reason || 'Unknown error'}`;
      } else if (decision.outcome === DecisionOutcome.DENY && finalOutcome !== DecisionOutcome.ERROR && finalOutcome !== DecisionOutcome.DENY) {
        finalOutcome = DecisionOutcome.DENY;
        overrideReason = `Denied by rule [${ruleId}]: ${decision.reason || 'No reason provided'}`;
      } else if (decision.outcome === DecisionOutcome.ALLOW && finalOutcome === DecisionOutcome.ABSTAIN) {
        finalOutcome = DecisionOutcome.ALLOW;
        finalReason = 'All evaluating rules allowed the action.';
      }
    }

    if (finalOutcome === DecisionOutcome.ERROR || finalOutcome === DecisionOutcome.DENY) {
      finalReason = overrideReason;
    }

    return {
      allowed: finalOutcome === DecisionOutcome.ALLOW, // For backwards compatibility, though outcome is richer
      outcome: finalOutcome,
      reason: finalReason,
      policyId,
      evaluatedAt: new Date(),
      durationMs,
      obligations: allObligations.length > 0 ? Array.from(new Set(allObligations)) : undefined,
      warnings: allWarnings.length > 0 ? Array.from(new Set(allWarnings)) : undefined,
    };
  }

  static fastFail(policyId: string, outcome: DecisionOutcome, reason: string, durationMs: number): PolicyDecision {
    return {
      allowed: false,
      outcome,
      reason,
      policyId,
      evaluatedAt: new Date(),
      durationMs
    };
  }
}
