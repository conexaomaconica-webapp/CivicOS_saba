// ============================================================================
// Domain Events — Execution Platform (AC-6)
// ============================================================================

export interface EventEnvelope<T = unknown> {
  readonly id: string; // UUID
  readonly event: string; // e.g. company.created
  readonly tenantId: string;
  readonly pluginId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly timestamp: number;
  readonly version: number;
  readonly payload: T;
}

export interface DomainEventStore {
  /**
   * Appends an event to the immutable event log.
   */
  append(event: EventEnvelope<any>): Promise<void>;
  
  /**
   * Retrieves events sequentially for replay purposes.
   * @param afterId Optional event UUID to start reading after
   * @param limit Maximum number of events to return
   */
  read(afterId?: string, limit?: number): Promise<EventEnvelope<any>[]>;
}
