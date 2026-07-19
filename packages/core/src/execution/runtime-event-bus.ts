// ============================================================================
// Runtime Event Bus — Execution Platform (AC-6)
// ============================================================================
// The third layer of events. Solely responsible for routing Domain Events
// to Async Consumers (Jobs, Automations, Webhooks) after they leave the Outbox.
// ============================================================================

import type { EventEnvelope } from './domain-events';

export type DomainEventHandler = (event: EventEnvelope<any>) => Promise<void> | void;

export class RuntimeEventBus {
  private readonly subscribers = new Map<string, Set<DomainEventHandler>>();

  /**
   * Subscribe an async consumer to a specific domain event.
   */
  subscribe(eventType: string, handler: DomainEventHandler): () => void {
    let handlers = this.subscribers.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(eventType, handlers);
    }
    handlers.add(handler);

    return () => {
      const h = this.subscribers.get(eventType);
      if (h) h.delete(handler);
    };
  }

  /**
   * Dispatches the event to all registered domain event handlers.
   * If any handler fails, the error is propagated so the Outbox Dispatcher
   * knows the event wasn't fully processed by all consumers.
   */
  async dispatch(event: EventEnvelope<any>): Promise<void> {
    const handlers = this.subscribers.get(event.event);
    if (!handlers || handlers.size === 0) return;

    // We await all handlers. If one fails, the dispatch throws,
    // signaling the caller (Outbox) to mark the message as FAILED and retry.
    await Promise.all(
      Array.from(handlers).map((handler) => handler(event))
    );
  }
}
