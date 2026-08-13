// ============================================================================
// Postgres Outbox Store — INF-003
// ============================================================================
// OutboxStore implementation against PostgreSQL, aligned with migration
// 016_messaging_outbox_dlq.sql. The claim uses the exact concurrency-safe
// `FOR UPDATE SKIP LOCKED` CTE from Doc 06 §4.2.
//
// NOTE: runs via the raw `DatabaseClient.query` (SQL-through-RPC) contract.
// In the current scaffold the Supabase adapter stubs raw SQL; the SQL emitted
// here is the executable contract validated by unit tests and applied through
// the service_role RPC path once wired.
// ============================================================================

import type { DatabaseClient } from '../database/database-client';
import type { OutboxStore } from './outbox-store';
import type { DeadLetterRecord, DeliveryAttemptRecord, DeliveryUpdate, ConsumptionRecord } from './outbox-store';
import type {
  ClaimedOutboxEvent,
  OutboxDeliveryState,
  OutboxEventEnvelope,
  OutboxEventStatus,
} from './outbox-types';

/** Row shape returned by `outbox_events` (snake_case, as in migration 016). */
interface OutboxEventRow {
  id: string;
  event_id: string;
  event_type: string;
  schema_version: string;
  event_version: string;
  tenant_id: string;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: number;
  producer: string;
  correlation_id?: string;
  causation_id?: string;
  trace_id?: string;
  actor_type?: string;
  actor_id?: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  available_at: string;
  locked_at?: string;
  locked_by?: string;
  last_error?: string;
  retry_count: number;
  next_retry_at?: string;
  created_at: string;
}

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly db: DatabaseClient) {}

  // -- Claim (FOR UPDATE SKIP LOCKED) ----------------------------------------

  async claimPendingEvents(input: {
    batchSize: number;
    workerId: string;
    now: Date;
  }): Promise<ClaimedOutboxEvent[]> {
    const sql = `
      WITH target_events AS (
        SELECT id FROM public.outbox_events
        WHERE status IN ('pending', 'failed')
          AND available_at <= NOW()
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.outbox_events
      SET status = 'processing',
          locked_at = NOW(),
          locked_by = $2
      WHERE id IN (SELECT id FROM target_events)
      RETURNING *;
    `;

    const rows = await this.db.query<OutboxEventRow>(sql, [input.batchSize, input.workerId]);
    return rows.map((row) => this.toClaimed(row));
  }

  // -- Delivery state ---------------------------------------------------------

  async hasConsumed(eventId: string, consumerName: string): Promise<boolean> {
    const sql = `
      SELECT EXISTS (
        SELECT 1 FROM public.event_consumptions
        WHERE event_id = $1 AND consumer_name = $2
      ) AS consumed;
    `;
    const rows = await this.db.query<{ consumed: boolean }>(sql, [eventId, consumerName]);
    return rows[0]?.consumed === true;
  }

  async getDeliveryState(input: {
    eventId: string;
    consumerName: string;
    now: Date;
  }): Promise<OutboxDeliveryState> {
    const sql = `
      SELECT id, status, attempt_count, next_retry_at
      FROM public.event_deliveries
      WHERE event_id = $1 AND consumer_name = $2
      LIMIT 1;
    `;
    const rows = await this.db.query<{
      id: string;
      status: string;
      attempt_count: number;
      next_retry_at?: string;
    }>(sql, [input.eventId, input.consumerName]);

    const row = rows[0];
    if (!row) {
      return { exists: false, delivered: false, due: true, attemptCount: 0 };
    }

    const nextRetryAt = row.next_retry_at ? new Date(row.next_retry_at) : undefined;
    const delivered = row.status === 'delivered';
    const due = !delivered && (nextRetryAt === undefined || nextRetryAt <= input.now);

    return {
      exists: true,
      delivered,
      due,
      attemptCount: row.attempt_count,
      nextRetryAt,
      deliveryId: row.id,
    };
  }

  // -- Delivery lifecycle ------------------------------------------------------

  async startDelivery(input: {
    eventId: string;
    consumerName: string;
    now: Date;
  }): Promise<{ deliveryId: string; attemptNumber: number }> {
    const sql = `
      INSERT INTO public.event_deliveries (event_id, consumer_name, status, attempt_count, last_attempt_at)
      VALUES ($1, $2, 'processing', 1, $3)
      ON CONFLICT (event_id, consumer_name)
      DO UPDATE SET status = 'processing',
                    last_attempt_at = EXCLUDED.last_attempt_at,
                    attempt_count = public.event_deliveries.attempt_count + 1
      RETURNING id, attempt_count;
    `;
    const rows = await this.db.query<{ id: string; attempt_count: number }>(sql, [
      input.eventId,
      input.consumerName,
      input.now.toISOString(),
    ]);

    const row = rows[0];
    if (!row) {
      throw new Error('Outbox: startDelivery returned no row');
    }
    return { deliveryId: row.id, attemptNumber: row.attempt_count };
  }

  async recordAttempt(record: DeliveryAttemptRecord): Promise<void> {
    const sql = `
      INSERT INTO public.event_delivery_attempts
        (delivery_id, event_id, consumer_name, attempt_number, attempted_at, execution_time_ms, status, error_stack)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    await this.db.query(sql, [
      record.deliveryId,
      record.eventId,
      record.consumerName,
      record.attemptNumber,
      record.now.toISOString(),
      record.executionTimeMs,
      record.status,
      record.errorStack ?? null,
    ]);
  }

  async recordConsumption(record: ConsumptionRecord): Promise<void> {
    const sql = `
      INSERT INTO public.event_consumptions
        (event_id, consumer_name, tenant_id, processed_at, execution_time_ms, result_status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id, consumer_name) DO NOTHING;
    `;
    await this.db.query(sql, [
      record.eventId,
      record.consumerName,
      record.tenantId,
      record.now.toISOString(),
      record.executionTimeMs,
      record.resultStatus,
    ]);
  }

  async updateDelivery(update: DeliveryUpdate): Promise<void> {
    const sql = `
      UPDATE public.event_deliveries
      SET status = $2,
          attempt_count = $3,
          next_retry_at = $4,
          delivered_at = $5,
          last_attempt_at = COALESCE($6, last_attempt_at),
          last_error_code = $7
      WHERE id = $1;
    `;
    await this.db.query(sql, [
      update.deliveryId,
      update.status,
      update.attemptCount,
      update.nextRetryAt ? update.nextRetryAt.toISOString() : null,
      update.deliveredAt ? update.deliveredAt.toISOString() : null,
      update.deliveredAt ? update.deliveredAt.toISOString() : null,
      update.errorCode ?? null,
    ]);
  }

  async promoteToDlq(record: DeadLetterRecord): Promise<void> {
    const sql = `
      INSERT INTO public.failed_event_queue
        (event_id, tenant_id, consumer_name, payload_redacted, first_failed_at, last_failed_at, error_stack, retry_count, status)
      VALUES ($1, $2, $3, $4::jsonb, $5, $5, $6, $7, 'requires_operator_action')
      ON CONFLICT (event_id, consumer_name)
      DO UPDATE SET last_failed_at = EXCLUDED.last_failed_at,
                    error_stack = EXCLUDED.error_stack,
                    retry_count = EXCLUDED.retry_count,
                    status = 'requires_operator_action',
                    resolved_at = NULL;
    `;
    await this.db.query(sql, [
      record.eventId,
      record.tenantId,
      record.consumerName,
      JSON.stringify(record.payloadRedacted),
      record.now.toISOString(),
      record.reason,
      record.retryCount,
    ]);
  }

  async finalizeEvent(input: { eventId: string; status: OutboxEventStatus; nextRetryAt?: Date }): Promise<void> {
    const sql = `
      UPDATE public.outbox_events
      SET status = $2,
          next_retry_at = $3,
          locked_at = NULL,
          locked_by = NULL
      WHERE event_id = $1;
    `;
    await this.db.query(sql, [
      input.eventId,
      input.status,
      input.nextRetryAt ? input.nextRetryAt.toISOString() : null,
    ]);
  }

  // -- Mappers ---------------------------------------------------------------

  private toClaimed(row: OutboxEventRow): ClaimedOutboxEvent {
    const event: OutboxEventEnvelope = {
      eventId: row.event_id,
      eventType: row.event_type,
      schemaVersion: row.schema_version,
      eventVersion: row.event_version,
      tenantId: row.tenant_id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      aggregateVersion: row.aggregate_version,
      producer: row.producer,
      correlationId: row.correlation_id,
      causationId: row.causation_id,
      traceId: row.trace_id,
      actorType: row.actor_type === 'user' || row.actor_type === 'system' || row.actor_type === 'api_key'
        ? row.actor_type
        : undefined,
      actorId: row.actor_id,
      payload: row.payload,
      occurredAt: row.created_at,
    };

    return {
      id: row.id,
      event,
      status: row.status,
      retryCount: row.retry_count,
      lockedBy: row.locked_by,
    };
  }
}
