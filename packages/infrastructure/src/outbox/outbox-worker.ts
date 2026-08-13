// ============================================================================
// Outbox Worker — INF-003
// ============================================================================
// Polls the outbox, dispatches events to registered consumers with
// At-Least-Once semantics and per-consumer idempotency (`event_consumptions`
// UNIQUE(event_id, consumer_name)), applies exponential-backoff retries, and
// promotes exhausted events to the DLQ with redacted payloads (Doc 06 §4/§5).
//
// Each poll cycle (claim -> dispatch -> finalize) is isolated so a failure in
// one cycle never prevents the next cycle from running.
// ============================================================================

import type { StructuredLogger } from '@saas/core';
import type { OutboxConsumerRegistry } from './outbox-consumer-registry';
import type { PayloadRedactor } from './redaction';
import type { RetryPolicy } from './retry-policy';
import type { OutboxStore } from './outbox-store';
import type {
  ClaimedOutboxEvent,
  OutboxConsumer,
  OutboxConsumerOutcome,
  OutboxEventEnvelope,
} from './outbox-types';

export interface OutboxWorkerOptions {
  store: OutboxStore;
  registry: OutboxConsumerRegistry;
  retryPolicy: RetryPolicy;
  redactor: PayloadRedactor;
  /** Number of events claimed per poll. Default: 50 (Doc 06 §4.2). */
  batchSize?: number;
  /** Interval between polls in ms. Default: 1000. */
  pollIntervalMs?: number;
  /** Identifier used in `locked_by` for multi-worker coordination. */
  workerId?: string;
  logger?: StructuredLogger;
}

/**
 * Pull-based outbox worker. Use `processBatch()` for manual/test runs, or
 * `start()`/`stop()` for the polling loop.
 */
export class OutboxWorker {
  private readonly store: OutboxStore;
  private readonly registry: OutboxConsumerRegistry;
  private readonly retryPolicy: RetryPolicy;
  private readonly redactor: PayloadRedactor;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly workerId: string;
  private readonly logger: StructuredLogger | undefined;

  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(options: OutboxWorkerOptions) {
    this.store = options.store;
    this.registry = options.registry;
    this.retryPolicy = options.retryPolicy;
    this.redactor = options.redactor;
    this.batchSize = options.batchSize ?? 50;
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.workerId = options.workerId ?? 'worker_unknown';
    this.logger = options.logger;
  }

  get isRunning(): boolean {
    return this.running;
  }

  // -- Lifecycle -------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.processBatch().catch((err) => {
        this.logger?.error('Outbox: poll cycle failed', err as Error);
      });
    }, this.pollIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // -- Polling ---------------------------------------------------------------

  /**
   * Runs a single poll cycle: claims a batch of due events and dispatches each
   * to every matching consumer. Returns the number of events processed.
   */
  async processBatch(): Promise<number> {
    const now = new Date();
    const claimed = await this.store.claimPendingEvents({
      batchSize: this.batchSize,
      workerId: this.workerId,
      now,
    });

    for (const event of claimed) {
      await this.processEvent(event);
    }

    return claimed.length;
  }

  // -- Dispatch --------------------------------------------------------------

  private async processEvent(claimed: ClaimedOutboxEvent): Promise<void> {
    const { event } = claimed;
    const consumers = this.registry.match(event.eventType);

    if (consumers.length === 0) {
      // No consumer is interested: mark as dispatched so the event is never
      // claimed again (dead-lettering is handled by the in-process EventBus).
      await this.store.finalizeEvent({ eventId: event.eventId, status: 'dispatched' });
      return;
    }

    let anyRetrying = false;
    let earliestRetry: Date | undefined;

    for (const consumer of consumers) {
      const outcome = await this.processConsumer(claimed, consumer);
      if (outcome.kind === 'retrying') {
        anyRetrying = true;
        if (earliestRetry === undefined || outcome.nextRetryAt < earliestRetry) {
          earliestRetry = outcome.nextRetryAt;
        }
      }
    }

    await this.store.finalizeEvent({
      eventId: event.eventId,
      status: anyRetrying ? 'failed' : 'dispatched',
      nextRetryAt: earliestRetry,
    });
  }

  private async processConsumer(
    claimed: ClaimedOutboxEvent,
    consumer: OutboxConsumer,
  ): Promise<OutboxConsumerOutcome> {
    const { event } = claimed;
    const now = new Date();

    // Idempotency guard: at-least-once semantics, exactly-once per consumer.
    // `event_consumptions` is the authoritative key (UNIQUE(event_id, consumer_name)),
    // checked BEFORE dispatch to survive a crash between consumption and delivery
    // finalization.
    const consumed = await this.store.hasConsumed(event.eventId, consumer.name);
    if (consumed) {
      return { kind: 'delivered' };
    }

    const state = await this.store.getDeliveryState({
      eventId: event.eventId,
      consumerName: consumer.name,
      now,
    });

    // Backoff gate: skip this consumer until its delivery is due.
    if (!state.due) {
      return { kind: 'skipped_not_due' };
    }

    const { deliveryId, attemptNumber } = await this.store.startDelivery({
      eventId: event.eventId,
      consumerName: consumer.name,
      now,
    });

    const startedAt = Date.now();
    const ctx = {
      tenantId: event.tenantId,
      eventId: event.eventId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      traceId: event.traceId,
      attempt: attemptNumber,
    };

    try {
      await consumer.handle(this.cloneEnvelope(event), ctx);

      const executionTimeMs = Date.now() - startedAt;
      const finishedAt = new Date();

      await this.store.recordConsumption({
        eventId: event.eventId,
        consumerName: consumer.name,
        tenantId: event.tenantId,
        executionTimeMs,
        resultStatus: 'success',
        now: finishedAt,
      });
      await this.store.recordAttempt({
        deliveryId,
        eventId: event.eventId,
        consumerName: consumer.name,
        attemptNumber,
        status: 'success',
        executionTimeMs,
        now: finishedAt,
      });
      await this.store.updateDelivery({
        deliveryId,
        status: 'delivered',
        deliveredAt: finishedAt,
        attemptCount: attemptNumber,
      });

      return { kind: 'delivered' };
    } catch (error) {
      const executionTimeMs = Date.now() - startedAt;
      const err = error instanceof Error ? error : new Error(String(error));
      const finishedAt = new Date();

      this.logger?.error(
        `Outbox: consumer "${consumer.name}" failed for event ${event.eventId}`,
        err,
        { eventType: event.eventType, tenantId: event.tenantId, attempt: attemptNumber },
      );

      await this.store.recordAttempt({
        deliveryId,
        eventId: event.eventId,
        consumerName: consumer.name,
        attemptNumber,
        status: 'failed',
        executionTimeMs,
        errorStack: err.stack ?? err.message,
        now: finishedAt,
      });

      if (this.retryPolicy.shouldRetry(attemptNumber)) {
        const nextRetryAt = this.retryPolicy.nextRetryAt(attemptNumber, now);
        await this.store.updateDelivery({
          deliveryId,
          status: 'failed',
          errorCode: err.message,
          nextRetryAt,
          attemptCount: attemptNumber,
        });
        return { kind: 'retrying', nextRetryAt };
      }

      // Exhausted retries: promote to the DLQ with a redacted payload.
      const payloadRedacted = this.redactor.redact(event.payload);
      await this.store.promoteToDlq({
        eventId: event.eventId,
        tenantId: event.tenantId,
        consumerName: consumer.name,
        payloadRedacted,
        reason: err.message,
        retryCount: attemptNumber,
        now: finishedAt,
      });
      await this.store.updateDelivery({
        deliveryId,
        status: 'failed',
        errorCode: err.message,
        attemptCount: attemptNumber,
      });

      return { kind: 'dead_letter', reason: err.message };
    }
  }

  private cloneEnvelope(event: OutboxEventEnvelope): OutboxEventEnvelope {
    return {
      ...event,
      payload: structuredCloneSafe(event.payload),
    };
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return value;
}
