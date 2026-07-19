import { defineEvent } from '@saas/sdk';

export interface BusinessBasePayload {
  businessId: string;
  tenantId: string;
}

export const businessCreatedEvent = defineEvent({
  name: 'business.created.v1',
  description: 'Fired when a new business is created as a draft',
  payload: { businessId: 'string', tenantId: 'string' }
});

export const businessSubmittedEvent = defineEvent({
  name: 'business.submitted.v1',
  description: 'Fired when a business is submitted for review',
  payload: { businessId: 'string', tenantId: 'string' }
});

export const businessApprovedEvent = defineEvent({
  name: 'business.approved.v1',
  description: 'Fired when a business is approved',
  payload: { businessId: 'string', tenantId: 'string' }
});

export const businessRejectedEvent = defineEvent({
  name: 'business.rejected.v1',
  description: 'Fired when a business is rejected',
  payload: { businessId: 'string', tenantId: 'string' }
});

export const businessPublishedEvent = defineEvent({
  name: 'business.published.v1',
  description: 'Fired when a business is published to the directory',
  payload: { businessId: 'string', tenantId: 'string' }
});

export const businessArchivedEvent = defineEvent({
  name: 'business.archived.v1',
  description: 'Fired when a business is archived',
  payload: { businessId: 'string', tenantId: 'string' }
});
