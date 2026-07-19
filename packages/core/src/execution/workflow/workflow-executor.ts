// ============================================================================
// Workflow Executor — Workflow Runtime (AC-6B)
// ============================================================================

import type { RuntimeEventBus } from '../runtime-event-bus';
import type { WorkflowRegistry } from './workflow-registry';
import type { ConditionResolver } from './condition-resolver';
import type { ActionDispatcher } from './action-dispatcher';
import type { EventEnvelope } from '../domain-events';
import type { ActionResult } from './workflow-types';

export class WorkflowExecutor {
  constructor(
    private readonly eventBus: RuntimeEventBus,
    private readonly registry: WorkflowRegistry,
    private readonly conditionResolver: ConditionResolver,
    private readonly actionDispatcher: ActionDispatcher
  ) {}

  /**
   * Subscribes the executor to all events that have registered workflows.
   */
  start(): void {
    const allWorkflows = this.registry.getAll();
    const uniqueEvents = new Set(allWorkflows.map(w => w.trigger.event));

    for (const eventName of uniqueEvents) {
      this.eventBus.subscribe(eventName, async (event: EventEnvelope<any>) => {
        await this.handleEvent(event);
      });
    }
  }

  private async handleEvent(event: EventEnvelope<any>): Promise<void> {
    const workflows = this.registry.getWorkflowsForEvent(event.event);

    for (const workflow of workflows) {
      // 1. Evaluate Condition
      const isMatch = this.conditionResolver.evaluate(workflow.condition, event);
      if (!isMatch) {
        continue; // Skip this workflow
      }

      // 2. Dispatch Actions
      for (const action of workflow.actions) {
        try {
          const result: ActionResult = await this.actionDispatcher.dispatch(action, event);
          
          if (result.status === 'failed') {
            console.error(`Action ${action.descriptorId} failed`, result.error);
            // Decide if we should abort the remaining actions in the workflow 
            // depending on a Workflow Execution Policy.
          }
        } catch (error) {
           console.error(`Fatal error dispatching action ${action.descriptorId}`, error);
        }
      }
    }
  }
}
