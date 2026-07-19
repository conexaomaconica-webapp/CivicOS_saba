// ============================================================================
// Policy Pipeline — Policy Engine (AC-6C)
// ============================================================================

import type { PolicyRegistry } from './policy-registry';
import type { RuleRegistry } from './rule-registry';
import { DecisionAggregator } from './decision-aggregator';
import type { PolicyDiagnostics } from './policy-diagnostics';
import type { EvaluationContextBuilder } from './context-builder';
import { DecisionOutcome, type PolicyContext, type PolicyDecision, type PolicyRule, type RuleDecision } from './policy-types';

export class PolicyPipeline {
  constructor(
    private readonly policyRegistry: PolicyRegistry,
    private readonly ruleRegistry: RuleRegistry,
    private readonly diagnostics: PolicyDiagnostics,
    private readonly contextBuilder: EvaluationContextBuilder
  ) {}

  /**
   * Evaluates the full pyramid: Capability -> Permission -> ContextBuilder -> PolicyRules -> Decision
   */
  async evaluate(policyId: string, context: PolicyContext): Promise<PolicyDecision> {
    const startTime = performance.now();
    let finalDecision: PolicyDecision;

    try {
      // 1. Build the immutable context (This also validates capabilities and permissions)
      const richContext = await this.contextBuilder.buildContext(context);

      // 2. Fail Fast: Capability
      if (context.capabilityId && !richContext.capabilities?.includes(context.capabilityId)) {
        finalDecision = DecisionAggregator.fastFail(policyId, DecisionOutcome.DENY, `Tenant lacks capability: ${context.capabilityId}`, performance.now() - startTime);
        return finalDecision;
      }

      // 3. Fail Fast: Permission
      if (context.userId && context.capabilityId && !richContext.permissions?.includes('execute')) {
        finalDecision = DecisionAggregator.fastFail(policyId, DecisionOutcome.DENY, `User lacks permission to execute policy: ${policyId}`, performance.now() - startTime);
        return finalDecision;
      }

      // 4. Load Rules for Policy
      const ruleIds = this.policyRegistry.getRulesForPolicy(policyId);
      
      if (ruleIds.length === 0) {
        this.diagnostics.recordMissingPolicy(policyId);
        finalDecision = {
          allowed: false, // ABSTAIN is not ALLOW
          outcome: DecisionOutcome.ABSTAIN,
          reason: `Policy ${policyId} has no registered rules.`,
          policyId,
          evaluatedAt: new Date(),
          durationMs: performance.now() - startTime
        };
        return finalDecision;
      }

      // 5. Execute Rules with the frozen context
      const ruleDecisions = await Promise.all(
        ruleIds.map(async (ruleId) => {
          const rule = this.ruleRegistry.getRule(ruleId);
          if (!rule) {
             return { ruleId, decision: { outcome: DecisionOutcome.ERROR, reason: `Rule ${ruleId} not found in registry.` } };
          }
          const decision = await this.safeEvaluateRule(rule, richContext);
          return { ruleId, decision };
        })
      );

      // 6. Aggregate Decisions
      finalDecision = DecisionAggregator.aggregate(policyId, ruleDecisions, performance.now() - startTime);
      return finalDecision;

    } catch (error) {
       // Catch all for unexpected pipeline crashes (e.g. context builder failed)
       finalDecision = DecisionAggregator.fastFail(
         policyId, 
         DecisionOutcome.ERROR, 
         `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
         performance.now() - startTime
       );
       return finalDecision;
    } finally {
       if (finalDecision!) {
         this.diagnostics.recordEvaluation(finalDecision);
       }
    }
  }

  private async safeEvaluateRule(rule: PolicyRule, context: PolicyContext): Promise<RuleDecision> {
    try {
      if (rule.type === 'pure') {
        return (rule as any).evaluate(context);
      } else {
        return await (rule as any).evaluate(context);
      }
    } catch (error) {
      return {
        outcome: DecisionOutcome.ERROR,
        reason: `Rule threw an exception: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
