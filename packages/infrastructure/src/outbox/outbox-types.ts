// ============================================================================
// Outbox Types — Transactional Outbox Runtime (INF-003)
// ============================================================================
// Types for the transactional outbox pattern (Doc 06 §2/§4): the standard event
// envelope, consumer contracts, and persistence records aligned with migration
// 016_messaging_outbox_dlq.sql.
//
// INVARIANT: Contains ZERO business logic.
// ============================================================================

/** Standardized event envelope transported through the outbox (Doc 06 §2). */
export interface OutboxEventEnvelope {
  eventId: string;
  eventType: string;
  schemaVersion: string;
  eventVersion: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  producer: string;
  correlationId?: string;
  causationId?: string;
  traceId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  actorId?: string;
  payload: Record<string, unknown>;
  /** ISO-8601 timestamp of when the fact occurred (defaults to emit time). */
  occurredAt?: string;
}

export type OutboxEventStatus = 'pending' | 'processing' | 'dispatched' | 'failed';

/** A row of `outbox_events` claimed by a worker (locked as `processing`). */
export interface ClaimedOutboxEvent {
  id: string;
  event: OutboxEventEnvelope;
  status: OutboxEventStatus;
  retryCount: number;
  lockedBy?: string;
}

/** Delivery state of a consumer for an event (row of `event_deliveries`). */
export interface OutboxDeliveryState {
  exists: boolean;
  delivered: boolean;
  due: boolean;
  attemptCount: number;
  nextRetryAt?: Date;
  deliveryId?: string;
}

/** Context passed to a consumer handler on each delivery attempt. */
export interface OutboxConsumerContext {
  tenantId: string;
  eventId: string;
  eventType: string;
  correlationId?: string;
  traceId?: string;
  /** 1-based attempt number for this delivery. */
  attempt: number;
}

/** A registered consumer: idempotent per `(event_id, consumer_name)`. */
export interface OutboxConsumer {
  /** Stable identifier used as the idempotency key (event_id, consumer_name). */
  name: string;
  /**
   * Event types to consume. Supports exact matches and wildcard patterns
   * ending in `.*` (e.g. `"billing.*"`) — mirrors the core EventBus semantics.
   */
  eventTypes: string[];
  handle(event: OutboxEventEnvelope, ctx: OutboxConsumerContext): Promise<void>;
}

/** Outcome of a single consumer delivery attempt. */
export type OutboxConsumerOutcome =
  | { kind: 'delivered' }
  | { kind: 'retrying'; nextRetryAt: Date }
  | { kind: 'dead_letter'; reason: string }
  | { kind: 'skipped_not_due' };

/** Payload redaction result persisted in the DLQ (`payload_redacted`). */
export interface RedactionRule {
  sensitiveKeys: string[];
  replacement: string;
}
