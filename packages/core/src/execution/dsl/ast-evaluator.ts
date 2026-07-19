// ============================================================================
// AST Evaluator — Automation DSL (AC-6E.1)
// ============================================================================

import {
  DEFAULT_AST_RUNTIME_LIMITS,
  type AstNode,
  type AstRuntimeLimits,
  type AutomationAST,
  type ComparisonNode,
  type EvaluationResult,
  type ExistenceNode,
  type LogicalNode
} from './ast-types';
import { SafePathResolver, SecurityViolationError } from './safe-path-resolver';

export class AstTimeoutError extends Error {
  constructor(ms: number) {
    super(`AstTimeoutError: Evaluation exceeded maximum execution time of ${ms}ms.`);
    this.name = 'AstTimeoutError';
  }
}

export class AstEvaluator {
  private readonly limits: AstRuntimeLimits;

  constructor(limits?: Partial<AstRuntimeLimits>) {
    this.limits = { ...DEFAULT_AST_RUNTIME_LIMITS, ...limits };
  }

  /**
   * Pure function to evaluate a normalized AST against a given context.
   */
  evaluate(ast: AutomationAST, context: Record<string, any>): EvaluationResult {
    const startTime = performance.now();
    let evaluatedNodes = 0;

    const checkTimeout = () => {
      const current = performance.now();
      if (current - startTime > this.limits.maxExecutionMs) {
        throw new AstTimeoutError(this.limits.maxExecutionMs);
      }
    };

    const evaluateNode = (node: AstNode): boolean => {
      checkTimeout();
      evaluatedNodes++;

      if (node.type === 'logical') {
        return evaluateLogical(node);
      } else if (node.type === 'comparison') {
        return evaluateComparison(node);
      } else if (node.type === 'existence') {
        return evaluateExistence(node);
      }
      return false;
    };

    const evaluateLogical = (node: LogicalNode): boolean => {
      if (node.operator === 'AND') {
        // Short-circuit: first false aborts
        for (const child of node.nodes) {
          if (!evaluateNode(child)) return false;
        }
        return true;
      } else if (node.operator === 'OR') {
        // Short-circuit: first true aborts
        for (const child of node.nodes) {
          if (evaluateNode(child)) return true;
        }
        return false;
      } else if (node.operator === 'NOT') {
        if (node.nodes.length !== 1) return false;
        return !evaluateNode(node.nodes[0]!);
      }
      return false;
    };

    const evaluateComparison = (node: ComparisonNode): boolean => {
      const actualValue = SafePathResolver.resolve(context, node.field);
      const expectedValue = node.value;

      switch (node.operator) {
        case 'EQ': return actualValue === expectedValue;
        case 'NE': return actualValue !== expectedValue;
        case 'GT': return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
        case 'GTE': return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
        case 'LT': return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
        case 'LTE': return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
        case 'IN': return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
        case 'NOT_IN': return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
        case 'CONTAINS': return Array.isArray(actualValue) && actualValue.includes(expectedValue);
        default: return false;
      }
    };

    const evaluateExistence = (node: ExistenceNode): boolean => {
      const actualValue = SafePathResolver.resolve(context, node.field);
      switch (node.operator) {
        case 'EXISTS': return actualValue !== undefined && actualValue !== null;
        case 'NOT_EXISTS': return actualValue === undefined || actualValue === null;
        default: return false;
      }
    };

    try {
      const matched = evaluateNode(ast.root);
      const durationMs = performance.now() - startTime;
      
      return {
        matched,
        durationMs,
        evaluatedNodes,
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;
      
      // Explicitly handle our custom errors
      if (error instanceof SecurityViolationError || error instanceof AstTimeoutError) {
        return {
          matched: false,
          durationMs,
          evaluatedNodes,
          reason: error.message
        };
      }

      // Catch-all
      return {
        matched: false,
        durationMs,
        evaluatedNodes,
        reason: `Unexpected evaluation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
