// ============================================================================
// Outbox Transport Abstraction
// ============================================================================


export interface OutboxTransport {
  publish(event: any): Promise<void>;
}
