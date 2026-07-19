// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { Container } from '../di/container';
import { RuntimeEventBus } from '../execution/runtime-event-bus';
import { WorkflowRegistry } from '../execution/workflow/workflow-registry';
import { ConditionResolver } from '../execution/workflow/condition-resolver';
import { ActionDispatcher } from '../execution/workflow/action-dispatcher';
import { WorkflowExecutor } from '../execution/workflow/workflow-executor';
import { ExecutionMode } from '../execution/workflow/workflow-types';
import type { ActionDescriptor, ActionExecutor, ActionResult, WorkflowDefinition } from '../execution/workflow/workflow-types';
import type { EventEnvelope } from '../execution/domain-events';
import type { OutboxTransport, OutboxMessage } from '../execution/outbox';

class MockOutboxTransport implements OutboxTransport {
  public messages: EventEnvelope<any>[] = [];

  async publish(event: EventEnvelope<any>): Promise<void> {
    this.messages.push(event);
  }
  async nextBatch(limit: number): Promise<OutboxMessage[]> { return []; }
  async acknowledge(id: string): Promise<void> {}
  async fail(id: string, error: string): Promise<void> {}
}

describe('Workflow Runtime (AC-6B)', () => {
  it('should evaluate conditions and dispatch actions using correct strategies (SYNC vs OUTBOX)', async () => {
    const container = new Container();
    const eventBus = new RuntimeEventBus();
    const outbox = new MockOutboxTransport();
    
    const registry = new WorkflowRegistry();
    const conditionResolver = new ConditionResolver();
    const dispatcher = new ActionDispatcher(container, outbox);
    const executor = new WorkflowExecutor(eventBus, registry, conditionResolver, dispatcher);

    // 1. Define Action Executors
    const sendEmailExecutor: ActionExecutor<{ to: string }> = {
      execute: vi.fn().mockResolvedValue({
        accepted: true,
        executionId: 'sync-123',
        mode: ExecutionMode.SYNC,
        status: 'completed'
      })
    };
    const sendEmailToken = { symbol: Symbol('SendEmail'), description: 'SendEmail' };
    container.register(sendEmailToken, sendEmailExecutor);

    const rebuildIndexExecutor: ActionExecutor<{ target: string }> = {
      execute: vi.fn().mockResolvedValue({
        accepted: true,
        executionId: 'outbox-456',
        mode: ExecutionMode.OUTBOX,
        status: 'queued'
      })
    };
    const rebuildIndexToken = { symbol: Symbol('RebuildIndex'), description: 'RebuildIndex' };
    container.register(rebuildIndexToken, rebuildIndexExecutor);

    // 2. Define Action Descriptors
    const emailDescriptor: ActionDescriptor = {
      id: 'send-email',
      executorToken: sendEmailToken,
      executionMode: ExecutionMode.SYNC
    };
    dispatcher.registerDescriptor(emailDescriptor);

    const rebuildDescriptor: ActionDescriptor = {
      id: 'rebuild-index',
      executorToken: rebuildIndexToken,
      executionMode: ExecutionMode.OUTBOX
    };
    dispatcher.registerDescriptor(rebuildDescriptor);

    // 3. Define Workflow
    const workflow: WorkflowDefinition = {
      id: 'wf-premium-company-created',
      name: 'On Premium Company Created',
      pluginId: 'test-plugin',
      trigger: { event: 'company.created' },
      condition: {
        predicate: (payload: any) => payload.plan === 'premium'
      },
      actions: [
        { descriptorId: 'send-email', params: { to: 'admin@system.local' } },
        { descriptorId: 'rebuild-index', params: { target: 'companies' } }
      ]
    };
    registry.register(workflow);

    // Start listening
    executor.start();

    // 4. Emit an event that DOES NOT match the condition
    await eventBus.dispatch({
      id: 'ev-1',
      event: 'company.created',
      tenantId: 'global',
      pluginId: 'test',
      correlationId: 'ev-1',
      causationId: 'ev-1',
      timestamp: Date.now(),
      version: 1,
      payload: { companyId: 'c1', plan: 'free' }
    });

    // Should not have executed anything
    expect(sendEmailExecutor.execute).not.toHaveBeenCalled();
    expect(outbox.messages.length).toBe(0);

    // 5. Emit an event that DOES match the condition
    await eventBus.dispatch({
      id: 'ev-2',
      event: 'company.created',
      tenantId: 'global',
      pluginId: 'test',
      correlationId: 'ev-2',
      causationId: 'ev-2',
      timestamp: Date.now(),
      version: 1,
      payload: { companyId: 'c2', plan: 'premium' }
    });

    // SYNC action should have been executed immediately
    expect(sendEmailExecutor.execute).toHaveBeenCalledTimes(1);
    expect(sendEmailExecutor.execute).toHaveBeenCalledWith({ to: 'admin@system.local' });

    // OUTBOX action should NOT have been executed directly...
    expect(rebuildIndexExecutor.execute).not.toHaveBeenCalled();
    // ...but it SHOULD have been sent to the outbox for async execution
    expect(outbox.messages.length).toBe(1);
    
    const outboxMsg = outbox.messages[0];
    expect(outboxMsg.event).toBe('platform.action.requested');
    expect(outboxMsg.correlationId).toBe('ev-2');
    expect(outboxMsg.payload.descriptorId).toBe('rebuild-index');
    expect(outboxMsg.payload.params.target).toBe('companies');
  });
});
