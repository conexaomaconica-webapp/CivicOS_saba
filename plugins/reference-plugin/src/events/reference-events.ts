import { defineEvent } from '@saas/sdk';

export const referenceExecutedEvent = defineEvent({
  name: 'reference.executed.v1',
  description: 'Fired when a reference workflow successfully executes',
  payload: {
    message: 'string'
  }
});
