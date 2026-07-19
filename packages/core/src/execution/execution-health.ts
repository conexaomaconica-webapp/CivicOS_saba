// ============================================================================
// Execution Health — Execution Platform (AC-6)
// ============================================================================
// Generates health reports for the entire Execution Runtime, including
// the Outbox and pending jobs.
// ============================================================================

export interface RuntimeHealthReport {
  readonly outboxStatus: 'Healthy' | 'Degraded' | 'Down';
  readonly pendingOutboxMessages: number;
  
  readonly jobRuntimeStatus: 'Healthy' | 'Degraded' | 'Down';
  readonly pendingJobs: number;
  readonly deadLetters: number;
  
  readonly averageProcessingTimeMs: number;
  readonly eventsPerSecond: number;
  readonly totalRetriesInLastHour: number;
  
  readonly lastFailureError?: string;
  readonly lastFailureTime?: number;
}
