// ============================================================================
// Transactional Outbox Producer — INF-003
// ============================================================================
// Writes domain events into `outbox_events` INSIDE the same ACID transaction as
// the business mutation (Doc 06 §1.1.3). The business state change and the
// outbox row are committed atomically, so no event is ever lost.
//
// `event_id` is UNIQUE (migration 016): re-publishing the same event id within
// a retried transaction is a no-op (ON CONFLICT DO NOTHING).
// ============================================================================

import type { DatabaseClient } from '../database/database-client';
import type { OutboxEventEnvelope } from './outbox-types';

const OUTBOX_COLUMNS = `
  event_id, event_type, schema_version, event_version, tenant_id,
  aggregate_type, aggregate_id, aggregate_version, producer,
  correlation_id, causation_id, trace_id, actor_type, actor_id, payload
`;

export class TransactionalOutboxProducer {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Publishes an event into the outbox. Must be invoked while a transaction is
   * open (see `runInTransaction`) so the event commits atomically with the
   * business mutation.
   */
  publish(event: OutboxEventEnvelope): Promise<void> {
    return this.insertEvent(this.db, event);
  }

  /**
   * Runs a business transaction and exposes a producer bound to its transaction
   * handle. Events published inside the callback commit atomically with the
   * business state change.
   */
  async runInTransaction<T>(
    callback: (producer: TransactionalOutboxProducer) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const txProducer = new TransactionalOutboxProducer(tx);
      return callback(txProducer);
    });
  }

  private async insertEvent(db: DatabaseClient, event: OutboxEventEnvelope): Promise<void> {
    const payload = {
      ...event.payload,
    };

    const sql = `
      INSERT INTO public.outbox_events (${OUTBOX_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
      ON CONFLICT (event_id) DO NOTHING;
    `;

    await db.query(sql, [
      event.eventId,
      event.eventType,
      event.schemaVersion ?? '1.0',
      event.eventVersion ?? '1.0',
      event.tenantId,
      event.aggregateType,
      event.aggregateId,
      event.aggregateVersion ?? 1,
      event.producer,
      event.correlationId ?? null,
      event.causationId ?? null,
      event.traceId ?? null,
      event.actorType ?? null,
      event.actorId ?? null,
      JSON.stringify(payload),
    ]);
  }
}
