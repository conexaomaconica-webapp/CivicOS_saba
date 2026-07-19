// ============================================================================
// Workflow Registry — Workflow Runtime (AC-6B)
// ============================================================================

import type { WorkflowDefinition } from './workflow-types';

export class WorkflowRegistry {
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly indexByEvent = new Map<string, Set<WorkflowDefinition>>();

  register(workflow: WorkflowDefinition): void {
    if (this.workflows.has(workflow.id)) {
      throw new Error(`Workflow with id "${workflow.id}" is already registered.`);
    }
    
    this.workflows.set(workflow.id, workflow);
    
    const eventName = workflow.trigger.event;
    let eventSet = this.indexByEvent.get(eventName);
    if (!eventSet) {
      eventSet = new Set();
      this.indexByEvent.set(eventName, eventSet);
    }
    eventSet.add(workflow);
  }

  getWorkflowsForEvent(eventName: string): readonly WorkflowDefinition[] {
    const eventSet = this.indexByEvent.get(eventName);
    return eventSet ? Array.from(eventSet) : [];
  }

  getAll(): readonly WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }
}
