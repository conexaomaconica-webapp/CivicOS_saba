// ============================================================================
// Outbox Transport Abstraction
// ============================================================================



export interface OutboxTransport {
  publish(event: unknown): Promise<void>;
}
