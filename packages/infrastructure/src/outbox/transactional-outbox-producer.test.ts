import { describe, it, expect } from 'vitest';

import { TransactionalOutboxProducer } from './transactional-outbox-producer';
import type { DatabaseClient } from '../database/database-client';
import type { OutboxEventEnvelope } from './outbox-types';

interface CapturedQuery {
  sql: string;
  params: unknown[];
}

/** Database client that records raw SQL so the producer contract is asserted. */
class RecordingDatabaseClient implements DatabaseClient {
  readonly queries: CapturedQuery[] = [];

  query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    this.queries.push({ sql, params: params ?? [] });
    return Promise.resolve([] as T[]);
  }

  insert<T>(_table: string, data: Partial<T>): Promise<T> {
    return Promise.resolve(data as T);
  }

  update<T>(_table: string, _id: string, data: Partial<T>): Promise<T> {
    return Promise.resolve(data as T);
  }

  delete(_table: string, _id: string): Promise<boolean> {
    void _table;
    void _id;
    return Promise.resolve(true);
  }

  async transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    return callback(this);
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
  correlationId: 'corr_1',
  traceId: 'trace_1',
  actorType: 'system',
  payload: { paymentId: 'pay_1' },
  ...overrides,
});

describe('TransactionalOutboxProducer', () => {
  it('writes the envelope into outbox_events via a single INSERT', async () => {
    const db = new RecordingDatabaseClient();
    const producer = new TransactionalOutboxProducer(db);

    await producer.publish(makeEvent());

    const insert = db.queries[0]!;
    expect(insert.sql).toContain('INSERT INTO public.outbox_events');
    expect(insert.params[0]).toBe('evt_1');
    expect(insert.params[1]).toBe('billing.payment.approved.v1');
    expect(insert.params[4]).toBe('tnt_1');
    expect(insert.params[8]).toBe('billing-service');
    expect(insert.params[9]).toBe('corr_1');
    expect(insert.params[12]).toBe('system');
    expect(insert.params[14]).toBe(JSON.stringify({ paymentId: 'pay_1' }));
  });

  it('publishes atomically inside the business transaction (runInTransaction)', async () => {
    const db = new RecordingDatabaseClient();
    const producer = new TransactionalOutboxProducer(db);

    await producer.runInTransaction(async (txProducer) => {
      await db.query('UPDATE business SET status = $1 WHERE id = $2', ['PUBLISHED', 'biz_1']);
      await txProducer.publish(makeEvent());
    });

    expect(db.queries.some((q) => q.sql.includes('UPDATE business'))).toBe(true);
    expect(db.queries.some((q) => q.sql.includes('INSERT INTO public.outbox_events'))).toBe(true);
  });

  it('is a no-op when the same event_id is published twice (ON CONFLICT DO NOTHING)', async () => {
    const db = new RecordingDatabaseClient();
    const producer = new TransactionalOutboxProducer(db);

    await producer.publish(makeEvent());
    await producer.publish(makeEvent());

    const inserts = db.queries.filter((q) => q.sql.includes('INSERT INTO public.outbox_events'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.sql).toContain('ON CONFLICT (event_id) DO NOTHING');
  });

  it('defaults schemaVersion/eventVersion to 1.0 when omitted', async () => {
    const db = new RecordingDatabaseClient();
    const producer = new TransactionalOutboxProducer(db);

    const minimal = {
      eventId: 'evt_2',
      eventType: 'billing.payment.approved.v1',
      tenantId: 'tnt_1',
      aggregateType: 'billing',
      aggregateId: 'pay_1',
      aggregateVersion: 1,
      producer: 'billing-service',
      payload: { paymentId: 'pay_1' },
    } as unknown as OutboxEventEnvelope;

    await producer.publish(minimal);

    const insert = db.queries[0]!;
    expect(insert.params[2]).toBe('1.0');
    expect(insert.params[3]).toBe('1.0');
  });
});
