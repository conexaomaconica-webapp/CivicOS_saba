// ============================================================================
// Execution Strategies — Workflow Runtime (AC-6B)
// ============================================================================

import type { ActionDescriptor, ActionExecutor, ActionResult, WorkflowAction } from './workflow-types';
import { ExecutionMode } from './workflow-types';
import type { OutboxTransport } from '../outbox';
import type { EventEnvelope } from '../domain-events';

export interface ExecutionStrategy {
  execute(
    descriptor: ActionDescriptor,
    action: WorkflowAction,
    executor: ActionExecutor,
    triggerEvent: EventEnvelope<any>
  ): Promise<ActionResult>;
}

export class SyncExecutionStrategy implements ExecutionStrategy {
  async execute(
    _descriptor: ActionDescriptor,
    action: WorkflowAction,
    executor: ActionExecutor,
    _triggerEvent: EventEnvelope<any>
  ): Promise<ActionResult> {
    try {
      const result = await executor.execute(action.params);
      return result;
    } catch (error) {
      return {
        accepted: false,
        executionId: `sync-${Date.now()}`,
        mode: ExecutionMode.SYNC,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export class OutboxExecutionStrategy implements ExecutionStrategy {
  constructor(private readonly outboxTransport: OutboxTransport) {}

  async execute(
    descriptor: ActionDescriptor,
    action: WorkflowAction,
    _executor: ActionExecutor,
    triggerEvent: EventEnvelope<any>
  ): Promise<ActionResult> {
    const executionId = `outbox-${Math.random().toString()}`;
    
    // In a real outbox implementation, the "Action execution request"
    // is serialized and appended to the Outbox as an event itself or a job payload.
    // For AC-6B, we simulate wrapping it in a generic internal domain event
    // so the Outbox can persist it and later deliver it.
    const actionRequestEvent: EventEnvelope<any> = {
      id: executionId,
      event: 'platform.action.requested',
      tenantId: triggerEvent.tenantId,
      pluginId: 'core',
      correlationId: triggerEvent.id, // Link to the trigger event
      causationId: triggerEvent.id,
      timestamp: Date.now(),
      version: 1,
      payload: {
        descriptorId: descriptor.id,
        params: action.params,
        // The executor token isn't easily serializable, but the Dispatcher will resolve it later.
      }
    };

    try {
      await this.outboxTransport.publish(actionRequestEvent);
      return {
        accepted: true,
        executionId,
        mode: ExecutionMode.OUTBOX,
        status: 'queued'
      };
    } catch (error) {
      return {
        accepted: false,
        executionId,
        mode: ExecutionMode.OUTBOX,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
