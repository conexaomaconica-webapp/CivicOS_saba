// ============================================================================
// Workflow Types — Workflow Runtime (AC-6B)
// ============================================================================


import type { RetryPolicy } from '../job-runtime';
import type { AutomationAST } from '../dsl/ast-types';

export enum ExecutionMode {
  SYNC = 'sync',
  COMMAND = 'command',
  OUTBOX = 'outbox',
}

export interface ActionDescriptor<TParams = any> {
  readonly _params?: TParams;
  readonly id: string;
  readonly executorToken: any; // Using any instead of ServiceToken for now
  readonly executionMode: ExecutionMode;
  readonly timeoutMs?: number;
  readonly retryPolicy?: RetryPolicy;
  readonly transactional?: boolean;
}

export interface ActionResult {
  readonly accepted: boolean;
  readonly executionId: string;
  readonly mode: ExecutionMode;
  readonly status: 'completed' | 'queued' | 'scheduled' | 'failed';
  readonly error?: string;
}

export interface ActionExecutor<TParams = Record<string, unknown>> {
  execute(params: TParams): Promise<ActionResult>;
}

export interface TriggerDefinition {
  readonly event: string;
}

export interface ConditionDefinition {
  readonly ast?: AutomationAST;
  // Fallback for older tests (AC-6B)
  readonly predicate?: (payload: any) => boolean;
}

export interface WorkflowAction {
  readonly descriptorId: string;
  readonly params: Record<string, unknown>;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly pluginId: string;
  readonly trigger: TriggerDefinition;
  readonly condition?: ConditionDefinition;
  readonly actions: readonly WorkflowAction[];
}
