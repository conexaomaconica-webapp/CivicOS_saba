// ============================================================================
// AST Types — Automation DSL (AC-6E.1)
// ============================================================================

export type AstOperator =
  | 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' // Comparison
  | 'IN' | 'NOT_IN' | 'CONTAINS'             // Collections
  | 'EXISTS' | 'NOT_EXISTS'                 // Existence
  | 'AND' | 'OR' | 'NOT';                   // Logical

export interface BaseNode {
  readonly type: 'comparison' | 'logical' | 'existence';
  readonly operator: AstOperator;
}

export interface ComparisonNode extends BaseNode {
  readonly type: 'comparison';
  readonly field: string;
  readonly value: unknown;
}

export interface ExistenceNode extends BaseNode {
  readonly type: 'existence';
  readonly field: string;
}

export interface LogicalNode extends BaseNode {
  readonly type: 'logical';
  readonly nodes: readonly AstNode[];
}

export type AstNode = ComparisonNode | ExistenceNode | LogicalNode;

export interface AutomationAST {
  readonly dslVersion: string;
  readonly root: AstNode;
}

export interface AstRuntimeLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxExecutionMs: number;
}

export const DEFAULT_AST_RUNTIME_LIMITS: AstRuntimeLimits = Object.freeze({
  maxDepth: 8,
  maxNodes: 200,
  maxExecutionMs: 10,
});

export interface EvaluationResult {
  readonly matched: boolean;
  readonly durationMs: number;
  readonly evaluatedNodes: number;
  readonly reason?: string;
  readonly warnings?: readonly string[];
}
