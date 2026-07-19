// ============================================================================
// AST Validator — Automation DSL (AC-6E.1)
// ============================================================================

import {
  DEFAULT_AST_RUNTIME_LIMITS,
  type AstNode,
  type AstRuntimeLimits,
  type AutomationAST
} from './ast-types';

export class AstValidationError extends Error {
  constructor(message: string) {
    super(`AstValidationError: ${message}`);
    this.name = 'AstValidationError';
  }
}

export class AstValidator {
  private readonly limits: AstRuntimeLimits;

  constructor(limits?: Partial<AstRuntimeLimits>) {
    this.limits = { ...DEFAULT_AST_RUNTIME_LIMITS, ...limits };
  }

  /**
   * Validates the structural integrity and limits of the given AST.
   * Throws AstValidationError if limits are exceeded or the schema is invalid.
   */
  validate(ast: AutomationAST): void {
    if (!ast || typeof ast !== 'object') {
      throw new AstValidationError('Invalid AST: root object is missing or not an object.');
    }

    if (ast.dslVersion !== '1.0') {
      throw new AstValidationError(`Unsupported DSL version: "${ast.dslVersion}". Expected "1.0".`);
    }

    if (!ast.root) {
      throw new AstValidationError('Invalid AST: "root" node is missing.');
    }

    let nodeCount = 0;

    const traverse = (node: AstNode, currentDepth: number): void => {
      if (!node || typeof node !== 'object') {
        throw new AstValidationError('Encountered an invalid node structure (not an object).');
      }

      nodeCount++;
      if (nodeCount > this.limits.maxNodes) {
        throw new AstValidationError(`AST exceeds maximum allowed nodes (${this.limits.maxNodes}).`);
      }

      if (currentDepth > this.limits.maxDepth) {
        throw new AstValidationError(`AST exceeds maximum allowed depth (${this.limits.maxDepth}).`);
      }

      if (!['comparison', 'existence', 'logical'].includes(node.type)) {
        throw new AstValidationError(`Unknown node type: "${(node as any).type}".`);
      }

      if (node.type === 'logical') {
        if (!Array.isArray(node.nodes) || node.nodes.length === 0) {
          throw new AstValidationError(`Logical node "${node.operator}" must have a non-empty "nodes" array.`);
        }
        for (const child of node.nodes) {
          traverse(child, currentDepth + 1);
        }
      } else if (node.type === 'comparison') {
        if (typeof node.field !== 'string' || !node.field) {
          throw new AstValidationError('Comparison node requires a non-empty string "field".');
        }
        if (!('value' in node)) {
          throw new AstValidationError(`Comparison node for field "${(node as any).field}" is missing a "value".`);
        }
      } else if (node.type === 'existence') {
        if (typeof node.field !== 'string' || !node.field) {
          throw new AstValidationError('Existence node requires a non-empty string "field".');
        }
      }
    };

    traverse(ast.root, 1);
  }
}
