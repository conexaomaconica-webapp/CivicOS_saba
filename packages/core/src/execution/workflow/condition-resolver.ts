// ============================================================================
// Condition Resolver — Workflow Runtime (AC-6B)
// ============================================================================

import type { ConditionDefinition } from './workflow-types';
import type { EventEnvelope } from '../domain-events';
import { AstValidator } from '../dsl/ast-validator';
import { AstNormalizer } from '../dsl/ast-normalizer';
import { AstEvaluator } from '../dsl/ast-evaluator';

export class ConditionResolver {
  private evaluator = new AstEvaluator();
  private validator = new AstValidator();

  /**
   * Resolves whether a condition is met given a specific domain event.
   */
  evaluate(condition: ConditionDefinition | undefined, event: EventEnvelope<any>): boolean {
    // If no condition is defined, it always matches.
    if (!condition) {
      return true;
    }

    if (condition.ast) {
      try {
        // 1. Validate
        this.validator.validate(condition.ast);
        // 2. Normalize
        const normalizedAst = AstNormalizer.normalize(condition.ast);
        // 3. Evaluate context: the context root available to SafePathResolver
        const context = {
          event: { id: (event as any).id, type: (event as any).type, timestamp: (event as any).timestamp }
        };
        const result = this.evaluator.evaluate(normalizedAst, context);
        return result.matched;
      } catch (err) {
        // If AST evaluation fails (validation or runtime), default to false for safety
        console.error('Condition AST evaluation failed:', err);
        return false;
      }
    }

    if (condition.predicate) {
      return condition.predicate(event.payload);
    }

    // Unimplemented AST condition defaults to false for safety
    return false;
  }
}
