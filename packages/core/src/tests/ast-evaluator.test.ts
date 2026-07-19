// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { AstValidator, AstValidationError } from '../execution/dsl/ast-validator';
import { AstNormalizer } from '../execution/dsl/ast-normalizer';
import { AstEvaluator, AstTimeoutError } from '../execution/dsl/ast-evaluator';
import { SafePathResolver, SecurityViolationError } from '../execution/dsl/safe-path-resolver';
import type { AutomationAST } from '../execution/dsl/ast-types';

describe('Automation DSL (AC-6E.1)', () => {

  const context = {
    payload: {
      amount: 150,
      user: {
        roles: ['admin', 'manager'],
        isActive: true
      }
    },
    event: {
      type: 'PaymentProcessed'
    }
  };

  describe('SafePathResolver', () => {
    it('should resolve allowed paths correctly', () => {
      expect(SafePathResolver.resolve(context, 'payload.amount')).toBe(150);
      expect(SafePathResolver.resolve(context, 'payload.user.roles.0')).toBe('admin');
      expect(SafePathResolver.resolve(context, 'event.type')).toBe('PaymentProcessed');
    });

    it('should block arbitrary roots', () => {
      expect(() => SafePathResolver.resolve(context, 'process.env')).toThrow(SecurityViolationError);
    });

    it('should block prototype pollution vectors', () => {
      expect(() => SafePathResolver.resolve(context, 'payload.__proto__')).toThrow(SecurityViolationError);
      expect(() => SafePathResolver.resolve(context, 'payload.constructor.prototype')).toThrow(SecurityViolationError);
    });

    it('should return undefined for non-existent safe paths without throwing', () => {
      expect(SafePathResolver.resolve(context, 'payload.missing.field')).toBeUndefined();
    });
  });

  describe('AST Validator', () => {
    const validator = new AstValidator({ maxDepth: 3, maxNodes: 5 });

    it('should validate a correct AST', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: {
          type: 'comparison',
          operator: 'GT',
          field: 'payload.amount',
          value: 100
        }
      };
      expect(() => validator.validate(ast)).not.toThrow();
    });

    it('should throw on max depth exceeded', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: {
          type: 'logical', operator: 'AND', nodes: [
            { type: 'logical', operator: 'AND', nodes: [
              { type: 'logical', operator: 'AND', nodes: [
                { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 1 }
              ]}
            ]}
          ]
        }
      };
      expect(() => validator.validate(ast)).toThrow(/maximum allowed depth/);
    });

    it('should throw on max nodes exceeded', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: {
          type: 'logical', operator: 'OR', nodes: [
            { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 1 },
            { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 2 },
            { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 3 },
            { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 4 },
            { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 5 }
          ]
        }
      };
      expect(() => validator.validate(ast)).toThrow(/maximum allowed nodes/);
    });
  });

  describe('AST Normalizer', () => {
    it('should uppercase operators', () => {
      const ast: any = {
        dslVersion: '1.0',
        root: {
          type: 'logical',
          operator: 'and',
          nodes: [{ type: 'comparison', operator: 'eq', field: 'payload.x', value: 1 }]
        }
      };
      const normalized = AstNormalizer.normalize(ast);
      expect(normalized.root.operator).toBe('AND');
      expect((normalized.root as any).nodes[0].operator).toBe('EQ');
    });
  });

  describe('AST Evaluator', () => {
    const evaluator = new AstEvaluator({ maxExecutionMs: 50 });

    it('should evaluate complex logical conditions correctly', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: {
          type: 'logical',
          operator: 'AND',
          nodes: [
            { type: 'comparison', operator: 'GT', field: 'payload.amount', value: 100 },
            { type: 'comparison', operator: 'CONTAINS', field: 'payload.user.roles', value: 'admin' },
            { type: 'existence', operator: 'EXISTS', field: 'payload.user.isActive' }
          ]
        }
      };
      const result = evaluator.evaluate(ast, context);
      expect(result.matched).toBe(true);
      expect(result.evaluatedNodes).toBe(4); // AND + 3 children
    });

    it('should short-circuit OR evaluations', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: {
          type: 'logical',
          operator: 'OR',
          nodes: [
            { type: 'comparison', operator: 'EQ', field: 'payload.amount', value: 150 }, // True
            { type: 'comparison', operator: 'EQ', field: 'payload.amount', value: 200 }  // Should not be evaluated
          ]
        }
      };
      const result = evaluator.evaluate(ast, context);
      expect(result.matched).toBe(true);
      expect(result.evaluatedNodes).toBe(2); // OR + first child
    });

    it('should handle timeout correctly', () => {
      const slowEvaluator = new AstEvaluator({ maxExecutionMs: -1 }); // Instant timeout
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: { type: 'comparison', operator: 'EQ', field: 'payload.x', value: 1 }
      };
      const result = slowEvaluator.evaluate(ast, context);
      expect(result.matched).toBe(false);
      expect(result.reason).toContain('AstTimeoutError');
    });

    it('should fail securely on prototype pollution attempt during evaluation', () => {
      const ast: AutomationAST = {
        dslVersion: '1.0',
        root: { type: 'comparison', operator: 'EQ', field: 'payload.__proto__.polluted', value: true }
      };
      const result = evaluator.evaluate(ast, context);
      expect(result.matched).toBe(false);
      expect(result.reason).toContain('SecurityViolation');
    });
  });
});
