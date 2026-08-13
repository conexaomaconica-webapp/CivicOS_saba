// ============================================================================
// Outbox Store — Persistence Contract (INF-003)
// ============================================================================
// Storage abstraction used by the OutboxWorker. Implemented against PostgreSQL
// (see postgres-outbox-store.ts) with the exact SQL from Doc 06 §4.2
// (FOR UPDATE SKIP LOCKED claim) and aligned with migration 016.
// ============================================================================

import type {
  ClaimedOutboxEvent,
  OutboxDeliveryState,
  OutboxEventEnvelope,
  OutboxEventStatus,
} from './outbox-types';

export interface ClaimEventsInput {
  batchSize: number;
  workerId: string;
  now: Date;
}

export interface DeliveryAttemptRecord {
  deliveryId: string;
  eventId: string;
  consumerName: string;
  attemptNumber: number;
  status: 'success' | 'failed';
  executionTimeMs: number;
  errorStack?: string;
  now: Date;
}

export interface ConsumptionRecord {
  eventId: string;
  consumerName: string;
  tenantId: string;
  executionTimeMs: number;
  resultStatus: string;
  now: Date;
}

export interface DeliveryUpdate {
  deliveryId: string;
  status: 'delivered' | 'failed';
  errorCode?: string;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  attemptCount: number;
}

export interface DeadLetterRecord {
  eventId: string;
  tenantId: string;
  consumerName: string;
  payloadRedacted: unknown;
  reason: string;
  retryCount: number;
  now: Date;
}

export interface FinalizeEventInput {
  eventId: string;
  status: OutboxEventStatus;
  nextRetryAt?: Date;
}

export interface OutboxStore {
  /**
   * Claims a batch of due events atomically. The PostgreSQL implementation
   * relies on `FOR UPDATE SKIP LOCKED` (Doc 06 §4.2) so concurrent workers
   * never double-process the same event.
   */
  claimPendingEvents(input: ClaimEventsInput): Promise<ClaimedOutboxEvent[]>;

  /** Current delivery state of a consumer for an event (idempotency + backoff gate). */
  getDeliveryState(input: { eventId: string; consumerName: string; now: Date }): Promise<OutboxDeliveryState>;

  /**
   * True when a successful execution is already recorded for the pair
   * (eventId, consumerName) in `event_consumptions`. This is the authoritative
   * idempotency key (Doc 06 §4.1: UNIQUE(event_id, consumer_name)) and is
   * checked BEFORE dispatch to guarantee exactly-once processing even when a
   * worker crashes between consumption and delivery finalization.
   */
  hasConsumed(eventId: string, consumerName: string): Promise<boolean>;

  /** Creates (first attempt) or updates (redelivery) the delivery and returns its handle. */
  startDelivery(input: {
    eventId: string;
    consumerName: string;
    now: Date;
  }): Promise<{ deliveryId: string; attemptNumber: number }>;

  /** Appends an immutable attempt to `event_delivery_attempts`. */
  recordAttempt(record: DeliveryAttemptRecord): Promise<void>;

  /** Records a successful execution in `event_consumptions` (idempotency key). */
  recordConsumption(record: ConsumptionRecord): Promise<void>;

  /** Updates the delivery current state after a success/failure. */
  updateDelivery(update: DeliveryUpdate): Promise<void>;

  /** Persists the redacted event in the DLQ (`failed_event_queue`). */
  promoteToDlq(record: DeadLetterRecord): Promise<void>;

  /** Marks the outbox event as dispatched (all consumers resolved) or failed (retrying). */
  finalizeEvent(input: FinalizeEventInput): Promise<void>;
}

/** Convenience type for a builder that produces envelopes inside a business tx. */
export interface OutboxEnvelopeWriter {
  publish(event: OutboxEventEnvelope): Promise<void>;
}
