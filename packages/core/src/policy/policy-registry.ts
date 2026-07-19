// ============================================================================
// Policy Registry — Policy Engine (AC-6C)
// ============================================================================

import type { PolicyDefinition } from './policy-types';
import type { RuleRegistry } from './rule-registry';

export class PolicyRegistry {
  private readonly policies = new Map<string, PolicyDefinition>();
  // Stores ordered rule IDs for a given policy
  private readonly rulesByPolicy = new Map<string, string[]>();

  constructor(private readonly ruleRegistry: RuleRegistry) {}

  registerPolicy(policy: PolicyDefinition): void {
    if (this.policies.has(policy.id)) {
      throw new Error(`Policy "${policy.id}" is already registered.`);
    }
    this.policies.set(policy.id, policy);
  }

  /**
   * Registers a rule to a policy. 
   * The rule must be pre-registered in the RuleRegistry.
   */
  attachRuleToPolicy(policyId: string, ruleId: string): void {
    if (!this.policies.has(policyId)) {
      throw new Error(`Cannot attach rule to unknown policy "${policyId}". Please register the policy first.`);
    }
    
    if (!this.ruleRegistry.hasRule(ruleId)) {
      throw new Error(`Cannot attach unknown rule "${ruleId}" to policy "${policyId}". Please register the rule in RuleRegistry first.`);
    }

    let rules = this.rulesByPolicy.get(policyId);
    if (!rules) {
      rules = [];
      this.rulesByPolicy.set(policyId, rules);
    }
    
    if (rules.includes(ruleId)) {
      throw new Error(`Rule "${ruleId}" is already attached to policy "${policyId}".`);
    }

    rules.push(ruleId);
  }

  getPolicy(policyId: string): PolicyDefinition | undefined {
    return this.policies.get(policyId);
  }

  getRulesForPolicy(policyId: string): readonly string[] {
    return this.rulesByPolicy.get(policyId) || [];
  }
}
