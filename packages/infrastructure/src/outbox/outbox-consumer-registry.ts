// ============================================================================
// Outbox Consumer Registry — INF-003
// ============================================================================
// Registry of consumers that process outbox events. Supports exact event type
// matches and wildcard patterns (`billing.*`, `*`) mirroring the core EventBus
// semantics (packages/core/src/event-bus.ts).
// ============================================================================

import type { OutboxConsumer } from './outbox-types';

export class OutboxConsumerRegistry {
  private readonly consumers: OutboxConsumer[] = [];

  register(consumer: OutboxConsumer): this {
    if (!consumer.name || consumer.name.length === 0) {
      throw new Error('OutboxConsumerRegistry: consumer must have a non-empty name');
    }
    if (consumer.eventTypes.length === 0) {
      throw new Error(`OutboxConsumerRegistry: consumer "${consumer.name}" must register at least one event type`);
    }
    const duplicate = this.consumers.some((c) => c.name === consumer.name);
    if (duplicate) {
      throw new Error(`OutboxConsumerRegistry: consumer "${consumer.name}" is already registered`);
    }
    this.consumers.push(consumer);
    return this;
  }

  registerMany(consumers: OutboxConsumer[]): this {
    for (const consumer of consumers) {
      this.register(consumer);
    }
    return this;
  }

  /** Returns every consumer interested in the given event type. */
  match(eventType: string): OutboxConsumer[] {
    return this.consumers.filter((consumer) =>
      consumer.eventTypes.some((pattern) => OutboxConsumerRegistry.matches(pattern, eventType)),
    );
  }

  /** Number of registered consumers. */
  get size(): number {
    return this.consumers.length;
  }

  /** Registered consumer names (for diagnostics / DLQ inspection). */
  get names(): string[] {
    return this.consumers.map((c) => c.name);
  }

  static matches(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      return eventType.startsWith(pattern.slice(0, -2) + '.');
    }
    return pattern === eventType;
  }
}
