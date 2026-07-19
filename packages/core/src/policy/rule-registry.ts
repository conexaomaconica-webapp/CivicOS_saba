// ============================================================================
// Rule Registry — Policy Engine (AC-6C)
// ============================================================================

import type { PureRule, AsyncRule, PolicyRule } from './policy-types';

export class RuleRegistry {
  private readonly rules = new Map<string, PolicyRule>();

  registerRule(rule: PureRule | AsyncRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule "${rule.id}" is already registered.`);
    }
    this.rules.set(rule.id, rule);
  }

  getRule(ruleId: string): PolicyRule | undefined {
    return this.rules.get(ruleId);
  }

  hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }
}
