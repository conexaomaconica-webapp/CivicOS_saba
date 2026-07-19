// ============================================================================
// Outbox Transport Abstraction
// ============================================================================

import type { EventPayload } from '@saas/core';

export interface OutboxTransport {
  publish(event: any): Promise<void>;
}
