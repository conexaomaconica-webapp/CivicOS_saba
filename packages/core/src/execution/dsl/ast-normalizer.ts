// ============================================================================
// AST Normalizer — Automation DSL (AC-6E.1)
// ============================================================================

import type { AstNode, AstOperator, AutomationAST } from './ast-types';

export class AstNormalizer {
  /**
   * Normalizes the AST structure by standardizing operators (uppercase)
   * and ensuring structural consistency before evaluation.
   * Returns a deep-cloned and normalized version of the AST.
   */
  static normalize(ast: AutomationAST): AutomationAST {
    return {
      dslVersion: ast.dslVersion,
      root: this.normalizeNode(ast.root)
    };
  }

  private static normalizeNode(node: AstNode): AstNode {
    // Standardize operator to uppercase
    const operator = (typeof node.operator === 'string' ? node.operator.toUpperCase() : node.operator) as AstOperator;

    if (node.type === 'logical') {
      return {
        ...node,
        operator,
        nodes: node.nodes.map(child => this.normalizeNode(child))
      };
    } else if (node.type === 'comparison') {
      return {
        ...node,
        operator,
      };
    } else if (node.type === 'existence') {
      return {
        ...node,
        operator,
      };
    }

    return node;
  }
}
