import { describe, it, expect, beforeEach } from 'vitest';

import { OutboxWorker } from './outbox-worker';
import { OutboxConsumerRegistry } from './outbox-consumer-registry';
import { defaultRedactor } from './redaction';
import { ExponentialBackoffRetryPolicy, noRetryPolicy } from './retry-policy';
import type {
  OutboxStore,
  ClaimEventsInput,
  DeliveryAttemptRecord,
  DeliveryUpdate,
  ConsumptionRecord,
  DeadLetterRecord,
  FinalizeEventInput,
} from './outbox-store';
import type {
  ClaimedOutboxEvent,
  OutboxConsumer,
  OutboxConsumerContext,
  OutboxDeliveryState,
  OutboxEventEnvelope,
  OutboxEventStatus,
} from './outbox-types';

interface MemoryEvent {
  id: string;
  event: OutboxEventEnvelope;
  status: OutboxEventStatus;
  nextRetryAt?: Date;
  createdAt: number;
}

interface MemoryDelivery {
  deliveryId: string;
  eventId: string;
  consumerName: string;
  status: 'delivered' | 'failed' | 'processing';
  attemptCount: number;
  nextRetryAt?: Date;
}

interface MemoryDlqRecord {
  eventId: string;
  consumerName: string;
  payloadRedacted: unknown;
  reason: string;
  retryCount: number;
}

/** Faithful in-memory implementation of the OutboxStore contract. */
class MemoryOutboxStore implements OutboxStore {
  readonly events = new Map<string, MemoryEvent>();
  readonly deliveries = new Map<string, MemoryDelivery>();
  readonly consumptions = new Set<string>();
  readonly attempts: DeliveryAttemptRecord[] = [];
  readonly dlq: MemoryDlqRecord[] = [];
  private counter = 0;

  seed(event: OutboxEventEnvelope): void {
    this.events.set(event.eventId, {
      id: `row-${this.events.size + 1}`,
      event,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  /** Simulates the backoff window elapsing for an event (event + deliveries). */
  makeDue(eventId: string): void {
    const evt = this.events.get(eventId);
    if (evt !== undefined) evt.nextRetryAt = undefined;
    for (const delivery of this.deliveries.values()) {
      if (delivery.eventId === eventId) delivery.nextRetryAt = undefined;
    }
  }

  claimPendingEvents(input: ClaimEventsInput): Promise<ClaimedOutboxEvent[]> {
    const now = input.now;
    const due = [...this.events.values()]
      .filter(
        (e) =>
          (e.status === 'pending' || e.status === 'failed') &&
          (e.nextRetryAt === undefined || e.nextRetryAt <= now),
      )
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, input.batchSize);

    for (const entry of due) {
      entry.status = 'processing';
    }

    return Promise.resolve(
      due.map((entry) => ({
        id: entry.id,
        event: entry.event,
        status: entry.status,
        retryCount: 0,
        lockedBy: input.workerId,
      })),
    );
  }

  hasConsumed(eventId: string, consumerName: string): Promise<boolean> {
    return Promise.resolve(this.consumptions.has(`${eventId}:${consumerName}`));
  }

  getDeliveryState(input: {
    eventId: string;
    consumerName: string;
    now: Date;
  }): Promise<OutboxDeliveryState> {
    const delivery = this.deliveries.get(`${input.eventId}:${input.consumerName}`);
    if (delivery === undefined) {
      return Promise.resolve({ exists: false, delivered: false, due: true, attemptCount: 0 });
    }
    const delivered = delivery.status === 'delivered';
    const due =
      !delivered && (delivery.nextRetryAt === undefined || delivery.nextRetryAt <= input.now);
    return Promise.resolve({
      exists: true,
      delivered,
      due,
      attemptCount: delivery.attemptCount,
      nextRetryAt: delivery.nextRetryAt,
      deliveryId: delivery.deliveryId,
    });
  }

  startDelivery(input: {
    eventId: string;
    consumerName: string;
    now: Date;
  }): Promise<{ deliveryId: string; attemptNumber: number }> {
    const key = `${input.eventId}:${input.consumerName}`;
    let delivery = this.deliveries.get(key);
    if (delivery === undefined) {
      delivery = {
        deliveryId: `dlv-${++this.counter}`,
        eventId: input.eventId,
        consumerName: input.consumerName,
        status: 'processing',
        attemptCount: 0,
      };
      this.deliveries.set(key, delivery);
    }
    delivery.status = 'processing';
    delivery.attemptCount += 1;
    return Promise.resolve({ deliveryId: delivery.deliveryId, attemptNumber: delivery.attemptCount });
  }

  recordAttempt(record: DeliveryAttemptRecord): Promise<void> {
    this.attempts.push(record);
    return Promise.resolve();
  }

  recordConsumption(record: ConsumptionRecord): Promise<void> {
    this.consumptions.add(`${record.eventId}:${record.consumerName}`);
    return Promise.resolve();
  }

  updateDelivery(update: DeliveryUpdate): Promise<void> {
    const delivery = [...this.deliveries.values()].find(
      (d) => d.deliveryId === update.deliveryId,
    );
    if (delivery !== undefined) {
      delivery.status = update.status;
      delivery.nextRetryAt = update.nextRetryAt;
    }
    return Promise.resolve();
  }

  promoteToDlq(record: DeadLetterRecord): Promise<void> {
    this.dlq.push({
      eventId: record.eventId,
      consumerName: record.consumerName,
      payloadRedacted: record.payloadRedacted,
      reason: record.reason,
      retryCount: record.retryCount,
    });
    return Promise.resolve();
  }

  finalizeEvent(input: FinalizeEventInput): Promise<void> {
    const entry = this.events.get(input.eventId);
    if (entry !== undefined) {
      entry.status = input.status;
      entry.nextRetryAt = input.nextRetryAt;
    }
    return Promise.resolve();
  }
}

const makeEvent = (overrides?: Partial<OutboxEventEnvelope>): OutboxEventEnvelope => ({
  eventId: 'evt_1',
  eventType: 'billing.payment.approved.v1',
  schemaVersion: '1.0',
  eventVersion: '1.0',
  tenantId: 'tnt_1',
  aggregateType: 'billing',
  aggregateId: 'pay_1',
  aggregateVersion: 1,
  producer: 'billing-service',
  payload: { paymentId: 'pay_1', cpf: '123.456.789-00' },
  ...overrides,
});

const consumer = (
  name: string,
  eventTypes: string[],
  onHandle?: (event: OutboxEventEnvelope, ctx: OutboxConsumerContext) => void | Promise<void>,
): OutboxConsumer => ({
  name,
  eventTypes,
  handle: async (event, ctx) => {
    await onHandle?.(event, ctx);
  },
});

describe('OutboxWorker', () => {
  let store: MemoryOutboxStore;
  let registry: OutboxConsumerRegistry;

  beforeEach(() => {
    store = new MemoryOutboxStore();
    registry = new OutboxConsumerRegistry();
  });

  const worker = (retryPolicy = noRetryPolicy, batchSize = 50) =>
    new OutboxWorker({
      store,
      registry,
      retryPolicy,
      redactor: defaultRedactor,
      batchSize,
    });

  it('dispatches an event to every matching consumer (exact and wildcard)', async () => {
    store.seed(makeEvent());
    const handled: string[] = [];
    registry.registerMany([
      consumer('billing-listener', ['billing.*'], () => void handled.push('billing-listener')),
      consumer('exact-listener', ['billing.payment.approved.v1'], () => void handled.push('exact-listener')),
      consumer('other-listener', ['contracts.contract.signed.v1'], () => void handled.push('other-listener')),
    ]);

    const processed = await worker().processBatch();

    expect(processed).toBe(1);
    expect(handled).toEqual(['billing-listener', 'exact-listener']);
    expect(store.consumptions.has('evt_1:billing-listener')).toBe(true);
    expect(store.consumptions.has('evt_1:other-listener')).toBe(false);
    expect(store.events.get('evt_1')?.status).toBe('dispatched');
  });

  it('skips consumers that already consumed the event (idempotency)', async () => {
    store.seed(makeEvent());
    const start = await store.startDelivery({ eventId: 'evt_1', consumerName: 'c1', now: new Date() });
    await store.recordConsumption({
      eventId: 'evt_1',
      consumerName: 'c1',
      tenantId: 'tnt_1',
      executionTimeMs: 5,
      resultStatus: 'success',
      now: new Date(),
    });
    await store.updateDelivery({ deliveryId: start.deliveryId, status: 'delivered', attemptCount: 1 });

    let calls = 0;
    registry.register(consumer('c1', ['*'], () => void (calls += 1)));

    await worker().processBatch();

    expect(calls).toBe(0);
    expect(store.events.get('evt_1')?.status).toBe('dispatched');
  });

  it('retries a failed consumer with exponential backoff', async () => {
    store.seed(makeEvent());
    const startedAt = Date.now();
    let calls = 0;
    registry.register(
      consumer('flaky', ['*'], () => {
        calls += 1;
        throw new Error('boom');
      }),
    );
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 3, backoffSeconds: [60, 300] });
    const w = worker(policy);

    await w.processBatch();
    expect(calls).toBe(1);

    const delivery = store.deliveries.get('evt_1:flaky');
    expect(delivery?.status).toBe('failed');
    expect(delivery?.attemptCount).toBe(1);
    expect(delivery?.nextRetryAt).toBeDefined();
    expect(delivery!.nextRetryAt!.getTime() - startedAt).toBeGreaterThanOrEqual(60_000);
    expect(store.events.get('evt_1')?.status).toBe('failed');

    store.makeDue('evt_1');
    await w.processBatch();
    expect(calls).toBe(2);
    expect(delivery?.attemptCount).toBe(2);
  });

  it('promotes an event to the DLQ with a redacted payload after exhausting retries', async () => {
    store.seed(makeEvent({ payload: { paymentId: 'pay_1', cpf: '123.456.789-00', token: 'abc' } }));
    let calls = 0;
    registry.register(
      consumer('always-fail', ['*'], () => {
        calls += 1;
        throw new Error('permanent');
      }),
    );
    const policy = new ExponentialBackoffRetryPolicy({ maxAttempts: 2, backoffSeconds: [60] });
    const w = worker(policy);

    await w.processBatch();
    store.makeDue('evt_1');
    await w.processBatch();

    expect(calls).toBe(2);
    expect(store.dlq).toHaveLength(1);
    const dlq = store.dlq[0];
    expect(dlq?.eventId).toBe('evt_1');
    expect(dlq?.consumerName).toBe('always-fail');
    expect(dlq?.reason).toBe('permanent');
    expect(dlq?.retryCount).toBe(2);
    const redacted = dlq?.payloadRedacted as Record<string, unknown>;
    expect(redacted['cpf']).toBe('[REDACTED]');
    expect(redacted['token']).toBe('[REDACTED]');
    expect(redacted['paymentId']).toBe('pay_1');
    expect(store.events.get('evt_1')?.status).toBe('dispatched');
  });

  it('skips a consumer whose delivery is not due yet (per-consumer backoff gate)', async () => {
    store.seed(makeEvent());

    // Event is due (nextRetryAt in the past), but only consumer "a" is due;
    // consumer "b" still has a future retry window.
    const evt = store.events.get('evt_1');
    if (evt === undefined) throw new Error('seed failed');
    evt.status = 'failed';
    evt.nextRetryAt = new Date(Date.now() - 1000);

    const a = await store.startDelivery({ eventId: 'evt_1', consumerName: 'a', now: new Date() });
    await store.updateDelivery({
      deliveryId: a.deliveryId,
      status: 'failed',
      nextRetryAt: new Date(Date.now() - 1000),
      attemptCount: 1,
    });
    const b = await store.startDelivery({ eventId: 'evt_1', consumerName: 'b', now: new Date() });
    await store.updateDelivery({
      deliveryId: b.deliveryId,
      status: 'failed',
      nextRetryAt: new Date(Date.now() + 3_600_000),
      attemptCount: 1,
    });

    const called: string[] = [];
    registry.registerMany([
      consumer('a', ['*'], () => void called.push('a')),
      consumer('b', ['*'], () => void called.push('b')),
    ]);

    await worker().processBatch();

    expect(called).toEqual(['a']);
  });

  it('finalizes events with no consumers as dispatched', async () => {
    store.seed(makeEvent({ eventType: 'nobody.listens.v1' }));

    await worker().processBatch();

    expect(store.events.get('evt_1')?.status).toBe('dispatched');
  });

  it('claims only up to the configured batch size', async () => {
    for (let i = 1; i <= 5; i += 1) {
      store.seed(makeEvent({ eventId: `evt_${i}` }));
    }

    const processed = await worker(noRetryPolicy, 2).processBatch();

    expect(processed).toBe(2);
    expect(store.consumptions.size).toBe(0);
  });

  it('claims each event exactly once per cycle (SKIP LOCKED semantics)', async () => {
    store.seed(makeEvent());
    const now = new Date();

    const first = await store.claimPendingEvents({ batchSize: 50, workerId: 'w1', now });
    const second = await store.claimPendingEvents({ batchSize: 50, workerId: 'w2', now });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('passes the event payload and attempt context to the consumer', async () => {
    store.seed(makeEvent());
    let received: { payload: Record<string, unknown>; attempt: number; tenantId: string } | undefined;
    registry.register(
      consumer('audit', ['*'], (event, ctx) => {
        received = { payload: event.payload, attempt: ctx.attempt, tenantId: ctx.tenantId };
      }),
    );

    await worker().processBatch();

    expect(received?.payload).toEqual({ paymentId: 'pay_1', cpf: '123.456.789-00' });
    expect(received?.attempt).toBe(1);
    expect(received?.tenantId).toBe('tnt_1');
  });
});

describe('OutboxConsumerRegistry', () => {
  it('matches exact and wildcard patterns', () => {
    const registry = new OutboxConsumerRegistry();
    const wildcard = consumer('w', ['billing.*'], undefined);
    const exact = consumer('e', ['contracts.contract.signed.v1'], undefined);
    const global = consumer('g', ['*'], undefined);
    registry.registerMany([wildcard, exact, global]);

    const match = registry.match('billing.payment.approved.v1').map((c) => c.name);
    expect(match).toContain('w');
    expect(match).toContain('g');
    expect(match).not.toContain('e');
  });

  it('rejects duplicate consumer names and empty registrations', () => {
    const registry = new OutboxConsumerRegistry();
    registry.register(consumer('dup', ['*'], undefined));
    expect(() => registry.register(consumer('dup', ['*'], undefined))).toThrow(/already registered/);
    expect(() => new OutboxConsumerRegistry().register(consumer('', ['*'], undefined))).toThrow(/name/);
    expect(() => new OutboxConsumerRegistry().register(consumer('x', [], undefined))).toThrow(/event type/);
  });
});
