// ============================================================================
// Event Bus — Core Kernel
// ============================================================================
// Typed, synchronous event bus for decoupled plugin-to-plugin communication.
// Supports exact matches, wildcard patterns, and dead-letter tracking.
//
// INVARIANT: This module contains ZERO business logic.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { CivicEvents, EventPayload } from './events';

export type EventHandler<T extends keyof CivicEvents> = (payload: EventPayload<T>) => void | Promise<void>;
export type AnyEventHandler = (payload: unknown) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface EventBusOptions {
  /** Enable dead-letter tracking for events with no subscribers. */
  trackDeadLetters?: boolean;
  /** Maximum dead-letter queue size before oldest entries are evicted. */
  maxDeadLetters?: number;
  /** Called when a handler throws. Defaults to console.error. */
  onError?: (event: string, error: unknown) => void;
}

export interface DeadLetter {
  event: string;
  payload: unknown;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class EventBus {
  private readonly handlers = new Map<string, Set<AnyEventHandler>>();
  private readonly wildcardHandlers = new Map<string, Set<AnyEventHandler>>();
  private readonly deadLetters: DeadLetter[] = [];
  private readonly options: Required<EventBusOptions>;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      trackDeadLetters: options.trackDeadLetters ?? false,
      maxDeadLetters: options.maxDeadLetters ?? 100,
      onError: options.onError ?? ((event, err) => {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }),
    };
  }

  // -- Subscribe ------------------------------------------------------------

  /**
   * Subscribe to an event.
   *
   * Supports wildcard patterns:
   * - `"auth.login"` — exact match
   * - `"auth.*"` — matches any event starting with `"auth."`
   * - `"*"` — matches ALL events
   *
   * @returns An unsubscribe function.
   */
  on<K extends keyof CivicEvents>(event: K, handler: EventHandler<K>): Unsubscribe;
  on(event: string, handler: AnyEventHandler): Unsubscribe;
  on(event: string, handler: AnyEventHandler): Unsubscribe {
    const typedHandler = handler as AnyEventHandler;

    if (event.endsWith('.*')) {
      const prefix = event.slice(0, -2);
      if (!this.wildcardHandlers.has(prefix)) {
        this.wildcardHandlers.set(prefix, new Set());
      }
      this.wildcardHandlers.get(prefix)!.add(typedHandler);
      return () => {
        this.wildcardHandlers.get(prefix)?.delete(typedHandler);
      };
    }

    if (event === '*') {
      if (!this.wildcardHandlers.has('')) {
        this.wildcardHandlers.set('', new Set());
      }
      this.wildcardHandlers.get('')!.add(typedHandler);
      return () => {
        this.wildcardHandlers.get('')?.delete(typedHandler);
      };
    }

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(typedHandler);

    return () => {
      this.handlers.get(event)?.delete(typedHandler);
    };
  }

  /**
   * Subscribe to an event and automatically unsubscribe after the first
   * invocation.
   */
  once<K extends keyof CivicEvents>(event: K, handler: EventHandler<K>): void;
  once(event: string, handler: AnyEventHandler): void;
  once(event: string, handler: AnyEventHandler): void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
  }

  // -- Emit -----------------------------------------------------------------

  /**
   * Emit an event to all matching subscribers.
   *
   * Handlers are invoked synchronously in registration order. If a handler
   * returns a Promise, errors are caught and forwarded to `onError`.
   */
  emit<K extends keyof CivicEvents>(event: K, payload: EventPayload<K>): void;
  emit(event: string, payload: unknown): void;
  emit(event: string, payload: unknown): void {
    let handled = false;

    // Exact handlers
    const exact = this.handlers.get(event);
    if (exact && exact.size > 0) {
      handled = true;
      for (const handler of exact) {
        this.safeInvoke(event, handler, payload);
      }
    }

    // Wildcard handlers: check prefixes
    for (const [prefix, handlers] of this.wildcardHandlers) {
      const matches =
        prefix === '' || // global wildcard "*"
        event.startsWith(prefix + '.');
      if (matches && handlers.size > 0) {
        handled = true;
        for (const handler of handlers) {
          this.safeInvoke(event, handler, payload);
        }
      }
    }

    // Dead-letter tracking
    if (!handled && this.options.trackDeadLetters) {
      this.deadLetters.push({ event, payload, timestamp: Date.now() });
      if (this.deadLetters.length > this.options.maxDeadLetters) {
        this.deadLetters.shift();
      }
    }
  }

  // -- Query ----------------------------------------------------------------

  /** Get events that were emitted but had no subscribers. */
  getDeadLetters(): readonly DeadLetter[] {
    return this.deadLetters;
  }

  /** Clear the dead-letter queue. */
  clearDeadLetters(): void {
    this.deadLetters.length = 0;
  }

  /** Check if an event has at least one subscriber. */
  hasListeners(event: string): boolean {
    const exact = this.handlers.get(event);
    if (exact && exact.size > 0) return true;

    for (const [prefix, handlers] of this.wildcardHandlers) {
      if ((prefix === '' || event.startsWith(prefix + '.')) && handlers.size > 0) {
        return true;
      }
    }
    return false;
  }

  /** Remove all handlers for a specific event. */
  offAll(event: string): void {
    this.handlers.delete(event);
  }

  /** Remove ALL handlers from the bus. Use with caution. */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.deadLetters.length = 0;
  }

  // -- Internals ------------------------------------------------------------

  private safeInvoke(event: string, handler: AnyEventHandler, payload: unknown): void {
    try {
      const result = handler(payload);
      if (result instanceof Promise) {
        result.catch((err) => this.options.onError(event, err));
      }
    } catch (err) {
      this.options.onError(event, err);
    }
  }
}
