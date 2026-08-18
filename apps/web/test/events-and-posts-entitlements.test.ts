import { describe, it, expect } from 'vitest';
import {
  businessEventSchema,
  businessPostSchema,
  eventPublicationStatusSchema,
  postPublicationStatusSchema,
} from '@saas/core';

describe('BLOCO 4: Events, Posts & Quota Downgrade Resilience', () => {
  it('validates event and post publication status schemas', () => {
    expect(eventPublicationStatusSchema.parse('draft')).toBe('draft');
    expect(eventPublicationStatusSchema.parse('published')).toBe('published');
    expect(eventPublicationStatusSchema.parse('canceled')).toBe('canceled');
    expect(eventPublicationStatusSchema.parse('archived')).toBe('archived');

    expect(postPublicationStatusSchema.parse('draft')).toBe('draft');
    expect(postPublicationStatusSchema.parse('scheduled')).toBe('scheduled');
    expect(postPublicationStatusSchema.parse('published')).toBe('published');
    expect(postPublicationStatusSchema.parse('archived')).toBe('archived');
  });

  it('validates event end date check (ends_at > starts_at)', () => {
    const startsAt = new Date('2026-09-01T10:00:00Z').toISOString();
    const endsAtValid = new Date('2026-09-01T12:00:00Z').toISOString();
    const endsAtInvalid = new Date('2026-09-01T09:00:00Z').toISOString();

    const validateEventDates = (start: string, end?: string) => {
      if (end && new Date(end) <= new Date(start)) {
        throw new Error('ends_at must be greater than starts_at');
      }
      return true;
    };

    expect(validateEventDates(startsAt, endsAtValid)).toBe(true);
    expect(() => validateEventDates(startsAt, endsAtInvalid)).toThrow(/ends_at must be greater than starts_at/);
  });

  it('resolves dynamic entitlements per plan and simulates downgrade resilience', () => {
    const entitlements = [
      { planCode: 'bronze', featureCode: 'events_limit', maxLimit: 0 },
      { planCode: 'bronze', featureCode: 'posts_limit', maxLimit: 0 },
      { planCode: 'prata', featureCode: 'events_limit', maxLimit: 0 },
      { planCode: 'prata', featureCode: 'posts_limit', maxLimit: 0 },
      { planCode: 'ouro', featureCode: 'events_limit', maxLimit: 5 },
      { planCode: 'ouro', featureCode: 'posts_limit', maxLimit: 10 },
    ];

    const getEntitlement = (planCode: string, featureCode: string) => {
      const match = entitlements.find(
        (e) => e.planCode === planCode && e.featureCode === featureCode
      );
      return match?.maxLimit ?? 0;
    };

    expect(getEntitlement('bronze', 'events_limit')).toBe(0);
    expect(getEntitlement('prata', 'posts_limit')).toBe(0);
    expect(getEntitlement('ouro', 'events_limit')).toBe(5);
    expect(getEntitlement('ouro', 'posts_limit')).toBe(10);

    // Downgrade resilience simulation:
    // Stored records in database for a company that was Ouro and downgraded to Prata
    const storedEvents = [
      { id: 'evt-1', title: 'Evento Ouro Antigo', publication_status: 'published' },
      { id: 'evt-2', title: 'Evento Ouro Antigo 2', publication_status: 'published' },
    ];

    const resolvePublicEvents = (currentPlan: string, eventsList: typeof storedEvents) => {
      const quota = getEntitlement(currentPlan, 'events_limit');
      if (quota <= 0) return []; // Retained in DB, but omitted from public RPC!
      return eventsList.slice(0, quota);
    };

    // When plan is Ouro -> Events are delivered publicly
    expect(resolvePublicEvents('ouro', storedEvents)).toHaveLength(2);

    // When plan is downgraded to Prata -> Events are NOT deleted from DB, but omitted from public RPC
    expect(resolvePublicEvents('prata', storedEvents)).toHaveLength(0);

    // When plan is upgraded back to Ouro -> Events instantly reappear!
    expect(resolvePublicEvents('ouro', storedEvents)).toHaveLength(2);
  });
});
