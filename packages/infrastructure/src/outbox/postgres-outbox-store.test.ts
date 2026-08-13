import { describe, it, expect } from 'vitest';

import { PostgresOutboxStore } from './postgres-outbox-store';
import type { DatabaseClient } from '../database/database-client';

/** Database client that returns scripted rows and records emitted SQL. */
class ScriptedDatabaseClient implements DatabaseClient {
  readonly queries: string[] = [];
  private rows: unknown[] = [];

  constructor(rows: unknown[] = []) {
    this.rows = rows;
  }

  query<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    this.queries.push(sql);
    void _params;
    return Promise.resolve(this.rows as T[]);
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

describe('PostgresOutboxStore', () => {
  it('claims events with FOR UPDATE SKIP LOCKED (Doc 06 §4.2)', async () => {
    const db = new ScriptedDatabaseClient([
      {
        id: 'row-1',
        event_id: 'evt_1',
        event_type: 'billing.payment.approved.v1',
        schema_version: '1.0',
        event_version: '1.0',
        tenant_id: 'tnt_1',
        aggregate_type: 'billing',
        aggregate_id: 'pay_1',
        aggregate_version: 1,
        producer: 'billing-service',
        correlation_id: null,
        causation_id: null,
        trace_id: null,
        actor_type: 'system',
        actor_id: null,
        payload: { paymentId: 'pay_1' },
        status: 'processing',
        available_at: '2026-08-04T23:45:00.000Z',
        locked_at: null,
        locked_by: 'worker_1',
        last_error: null,
        retry_count: 0,
        next_retry_at: null,
        created_at: '2026-08-04T23:45:00.000Z',
      },
    ]);
    const store = new PostgresOutboxStore(db);

    const claimed = await store.claimPendingEvents({
      batchSize: 50,
      workerId: 'worker_1',
      now: new Date('2026-08-04T23:46:00.000Z'),
    });

    const sql = db.queries[0];
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('status IN (\'pending\', \'failed\')');
    expect(sql).toContain('LIMIT $1');
    expect(sql).toContain('locked_by = $2');

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.event.eventId).toBe('evt_1');
    expect(claimed[0]?.event.eventType).toBe('billing.payment.approved.v1');
    expect(claimed[0]?.event.tenantId).toBe('tnt_1');
    expect(claimed[0]?.event.payload).toEqual({ paymentId: 'pay_1' });
    expect(claimed[0]?.status).toBe('processing');
  });

  it('returns an empty batch when nothing is due', async () => {
    const db = new ScriptedDatabaseClient([]);
    const store = new PostgresOutboxStore(db);

    const claimed = await store.claimPendingEvents({
      batchSize: 50,
      workerId: 'worker_1',
      now: new Date(),
    });

    expect(claimed).toEqual([]);
  });

  it('checks consumption existence via event_consumptions', async () => {
    const db = new ScriptedDatabaseClient([{ consumed: true }]);
    const store = new PostgresOutboxStore(db);

    const consumed = await store.hasConsumed('evt_1', 'consumer_a');

    expect(consumed).toBe(true);
    expect(db.queries[0]).toContain('event_consumptions');
  });

  it('persists DLQ records against failed_event_queue', async () => {
    const db = new ScriptedDatabaseClient([]);
    const store = new PostgresOutboxStore(db);

    await store.promoteToDlq({
      eventId: 'evt_1',
      tenantId: 'tnt_1',
      consumerName: 'consumer_a',
      payloadRedacted: { paymentId: 'pay_1', cpf: '[REDACTED]' },
      reason: 'permanent failure',
      retryCount: 3,
      now: new Date('2026-08-04T23:45:00.000Z'),
    });

    const sql = db.queries[0];
    expect(sql).toContain('INSERT INTO public.failed_event_queue');
    expect(sql).toContain('ON CONFLICT (event_id, consumer_name)');
    expect(sql).toContain('requires_operator_action');
  });
});
