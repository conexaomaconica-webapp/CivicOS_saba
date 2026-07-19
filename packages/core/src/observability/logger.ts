// ============================================================================
// Structured Logger Interface — CivicOS Observability
// ============================================================================

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  correlationId?: string;
  tenantId?: string;
  component?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface StructuredLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  
  /**
   * Creates a child logger with pre-bound metadata (e.g. component name).
   */
  child(meta: Record<string, unknown>): StructuredLogger;
}
