// ============================================================================
// Retry Policy — Outbox Worker (INF-003)
// ============================================================================
// Governs redelivery with exponential backoff (Doc 06 §5.1):
// intervals of 1min, 5min, 15min, 1h, 6h — up to 5 redeliveries per consumer
// (1 initial attempt + 5 redeliveries = 6 total attempts) before promotion of
// the event to the Dead Letter Queue.
// ============================================================================

export interface RetryPolicy {
  /** Total delivery attempts allowed before the event is promoted to the DLQ. */
  readonly maxAttempts: number;
  /** Whether another delivery attempt is allowed for the given attempt number. */
  shouldRetry(attemptNumber: number): boolean;
  /** Backoff delay (seconds) after a failed attempt (1-based attempt number). */
  delaySecondsForAttempt(attemptNumber: number): number;
  /** Absolute timestamp for the next delivery after a failed attempt. */
  nextRetryAt(attemptNumber: number, from: Date): Date;
}

export interface ExponentialBackoffRetryPolicyOptions {
  /** Total delivery attempts before DLQ promotion. Default: 6. */
  maxAttempts?: number;
  /** Delays after each failed attempt, in seconds. Default: 60, 300, 900, 3600, 21600. */
  backoffSeconds?: number[];
}

/**
 * Exponential backoff matching Doc 06 §5.1:
 * 1min, 5min, 15min, 1h, 6h with up to 5 redeliveries.
 */
export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;
  private readonly backoffSeconds: number[];

  constructor(options: ExponentialBackoffRetryPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 6;
    this.backoffSeconds = options.backoffSeconds ?? [60, 300, 900, 3600, 21600];
    if (this.maxAttempts < 1) {
      throw new RangeError('RetryPolicy maxAttempts must be at least 1');
    }
    if (this.backoffSeconds.length === 0) {
      throw new RangeError('RetryPolicy backoffSeconds must not be empty');
    }
  }

  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber >= 1 && attemptNumber < this.maxAttempts;
  }

  delaySecondsForAttempt(attemptNumber: number): number {
    const index = Math.min(Math.max(attemptNumber - 1, 0), this.backoffSeconds.length - 1);
    return this.backoffSeconds[index]!;
  }

  nextRetryAt(attemptNumber: number, from: Date): Date {
    return new Date(from.getTime() + this.delaySecondsForAttempt(attemptNumber) * 1000);
  }
}

/** Convenience retry policy with no redelivery: first failure promotes to DLQ. */
export const noRetryPolicy: RetryPolicy = {
  maxAttempts: 1,
  shouldRetry: () => false,
  delaySecondsForAttempt: () => 0,
  nextRetryAt: (_attemptNumber: number, from: Date) => from,
};
