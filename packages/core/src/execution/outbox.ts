// ============================================================================
// Outbox Runtime — Execution Platform (AC-6)
// ============================================================================
// Implements the Outbox Pattern to decouple database transactions from
// message broker delivery. 
// ============================================================================

import type { EventEnvelope } from './domain-events';
import type { RuntimeEventBus } from './runtime-event-bus';

export type OutboxState = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxMessage {
  readonly id: string; // Internal outbox entry ID
  readonly event: EventEnvelope<any>;
  state: OutboxState;
  attempts: number;
  lastError?: string;
  readonly createdAt: number;
  updatedAt: number;
}

/**
 * Abstraction for the underlying persistence of the Outbox.
 * Could be PostgreSQL, MongoDB, Kafka, or InMemory.
 */
export interface OutboxTransport {
  /**
   * Reads a batch of PENDING messages and optionally locks them (transitions to PROCESSING).
   */
  nextBatch(limit: number): Promise<OutboxMessage[]>;
  
  /**
   * Acknowledges that a message was successfully dispatched.
   * State should transition to PROCESSED.
   */
  acknowledge(id: string): Promise<void>;
  
  /**
   * Marks a message as FAILED. If attempts exceed the maximum allowed,
   * it should transition to DEAD_LETTER.
   */
  fail(id: string, error: string): Promise<void>;

  /**
   * Internal/Test usage: Appends a new message directly to the Outbox.
   * In a real implementation (like Postgres), this is done atomically in the
   * same transaction as the Domain entity mutation.
   */
  publish(event: EventEnvelope<any>): Promise<void>;
}

export class OutboxDispatcher {
  private isRunning = false;

  constructor(
    private readonly transport: OutboxTransport,
    private readonly runtimeEventBus: RuntimeEventBus,
    private readonly batchSize: number = 10,
    private readonly pollingIntervalMs: number = 1000
  ) {}

  /**
   * Starts the polling process.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  /**
   * Stops the polling process.
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Single poll cycle for testing purposes or manual triggering.
   */
  async processNextBatch(): Promise<number> {
    const batch = await this.transport.nextBatch(this.batchSize);
    if (batch.length === 0) return 0;

    for (const msg of batch) {
      try {
        await this.runtimeEventBus.dispatch(msg.event);
        await this.transport.acknowledge(msg.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.transport.fail(msg.id, errorMessage);
      }
    }

    return batch.length;
  }

  private poll(): void {
    if (!this.isRunning) return;

    this.processNextBatch()
      .catch((err) => {
        // Log the severe transport failure
        console.error('OutboxDispatcher: Transport error during polling', err);
      })
      .finally(() => {
        if (this.isRunning) {
          setTimeout(() => this.poll(), this.pollingIntervalMs);
        }
      });
  }
}
