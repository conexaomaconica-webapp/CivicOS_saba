// ============================================================================
// Jobs Contract — Core SaaS Framework
// ============================================================================
// Defines background task queueing contracts using the Strategy Pattern.
// Real runners reside in `@saas/jobs` using this interface.
// ============================================================================

export type JobPayload = Record<string, unknown>;

export interface JobOptions {
  readonly runAt?: Date;
  readonly attempts?: number;
  readonly maxAttempts?: number;
  readonly queueName?: string;
}

export interface Job {
  readonly id: string;
  readonly name: string;
  readonly payload: JobPayload;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly runAt: Date;
  readonly failedReason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Strategy Pattern interface for task engines. */
export interface JobQueueProvider {
  /** Enqueue a job using the concrete engine. */
  enqueue(
    jobName: string,
    payload: JobPayload,
    options?: JobOptions,
  ): Promise<string>;
}

export interface QueueService {
  /** Enqueue a job into the currently registered provider. */
  enqueue(
    jobName: string,
    payload: JobPayload,
    options?: JobOptions,
  ): Promise<string>;
}
