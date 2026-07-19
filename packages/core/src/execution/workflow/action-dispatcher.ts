// ============================================================================
// Action Dispatcher — Workflow Runtime (AC-6B)
// ============================================================================

import type { ActionDescriptor, WorkflowAction, ActionResult } from './workflow-types';
import { ExecutionMode } from './workflow-types';
import type { ExecutionStrategy } from './execution-strategies';
import { SyncExecutionStrategy, OutboxExecutionStrategy } from './execution-strategies';
import type { Container } from '../../di/container';
import type { OutboxTransport } from '../outbox';
import type { EventEnvelope } from '../domain-events';

export class ActionDispatcher {
  private readonly strategies = new Map<ExecutionMode, ExecutionStrategy>();
  private readonly descriptors = new Map<string, ActionDescriptor>();

  constructor(
    private readonly container: Container,
    outboxTransport?: OutboxTransport
  ) {
    this.strategies.set(ExecutionMode.SYNC, new SyncExecutionStrategy());
    
    // Command strategy would go to a CommandBus
    this.strategies.set(ExecutionMode.COMMAND, new SyncExecutionStrategy()); // Mocking command as sync for now
    
    if (outboxTransport) {
      this.strategies.set(ExecutionMode.OUTBOX, new OutboxExecutionStrategy(outboxTransport));
    }
  }

  registerDescriptor(descriptor: ActionDescriptor): void {
    if (this.descriptors.has(descriptor.id)) {
      throw new Error(`Action descriptor "${descriptor.id}" already registered.`);
    }
    this.descriptors.set(descriptor.id, descriptor);
  }

  async dispatch(action: WorkflowAction, triggerEvent: EventEnvelope<any>): Promise<ActionResult> {
    const descriptor = this.descriptors.get(action.descriptorId);
    if (!descriptor) {
      throw new Error(`Unknown action descriptor: ${action.descriptorId}`);
    }

    const strategy = this.strategies.get(descriptor.executionMode);
    if (!strategy) {
      throw new Error(`No strategy found for execution mode: ${descriptor.executionMode}`);
    }

    // Resolve the actual ActionExecutor from the DI Container
    const executor = this.container.resolve(descriptor.executorToken);

    // Delegate to strategy
    return strategy.execute(descriptor, action, executor as any, triggerEvent);
  }
}
