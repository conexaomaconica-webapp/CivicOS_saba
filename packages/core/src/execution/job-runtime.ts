// ============================================================================
// Job Runtime — Execution Platform (AC-6)
// ============================================================================
// Defines the universal interface for background job processing, decoupled
// from the underlying queue infrastructure.
// ============================================================================

import type { PluginContext } from '../plugins/plugin-context';

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoff: 'linear' | 'exponential';
  readonly delayMs: number;
  readonly deadLetter: boolean; // Whether to send to DLQ on final failure
}

export interface JobDefinition<T = any> {
  readonly id: string;
  readonly pluginId: string;
  readonly queue: string;
  readonly retryPolicy: RetryPolicy;
  readonly handler: JobHandler<T>;
}

export interface JobContext {
  readonly jobId: string;
  readonly attempt: number;
  readonly plugin: PluginContext;
}

export type JobHandler<T = any> = (payload: T, ctx: JobContext) => Promise<void>;

export interface JobQueueProvider {
  /**
   * Enqueues a job for execution.
   * @param definition The job definition
   * @param payload The raw payload or domain event envelope
   */
  enqueue<T>(definition: JobDefinition<T>, payload: T): Promise<string>;
  
  /**
   * Registers a worker to process jobs of a specific definition.
   */
  registerWorker<T>(definition: JobDefinition<T>, pluginContext: PluginContext): void;
}
