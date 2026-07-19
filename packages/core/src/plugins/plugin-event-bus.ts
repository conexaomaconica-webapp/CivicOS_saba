// ============================================================================
// Plugin EventBus — Plugin Runtime Sandbox
// ============================================================================
// A logical sandbox wrapper around the global EventBus.
// Ensures plugins can only emit and subscribe to Camada 2 (PluginEvents)
// and hides Camada 1 (CoreEvents) to prevent tampering.
// ============================================================================

import type { EventBus, Unsubscribe } from '../event-bus';
import type { PluginEvents, EventPayload } from '../events';

export type PluginEventHandler<T extends keyof PluginEvents> = (payload: EventPayload<T>) => void | Promise<void>;
export type AnyPluginEventHandler = (payload: unknown) => void | Promise<void>;

export class PluginEventBus {
  constructor(private readonly globalBus: EventBus) {}

  /**
   * Subscribe to a Plugin event. Core events are hidden by TypeScript type checking.
   * At runtime, any attempt to subscribe to a `core.*` or `kernel.*` or `plugin.*` 
   * (the actual Core event prefixes) will fail fast.
   */
  on<K extends keyof PluginEvents>(event: K, handler: PluginEventHandler<K>): Unsubscribe;
  on(event: string, handler: AnyPluginEventHandler): Unsubscribe;
  on(event: string, handler: AnyPluginEventHandler): Unsubscribe {
    this.assertNotCoreEvent(event);
    return this.globalBus.on(event, handler);
  }

  /**
   * Subscribe to a Plugin event once.
   */
  once<K extends keyof PluginEvents>(event: K, handler: PluginEventHandler<K>): void;
  once(event: string, handler: AnyPluginEventHandler): void;
  once(event: string, handler: AnyPluginEventHandler): void {
    this.assertNotCoreEvent(event);
    this.globalBus.once(event, handler);
  }

  /**
   * Emits a Plugin event. Core events cannot be emitted.
   */
  emit<K extends keyof PluginEvents>(event: K, payload: EventPayload<K>): void;
  emit(event: string, payload: unknown): void;
  emit(event: string, payload: unknown): void {
    this.assertNotCoreEvent(event);
    this.globalBus.emit(event, payload);
  }

  private assertNotCoreEvent(event: string): void {
    // Core event prefixes (as defined in events.ts)
    if (
      event.startsWith('kernel.') ||
      event.startsWith('plugin.discovered') ||
      event.startsWith('plugin.validation') ||
      event.startsWith('plugin.lifecycle') ||
      event.startsWith('registry.')
    ) {
      throw new Error(`Security Violation: Plugins are not allowed to emit or subscribe to internal Core Event "${event}".`);
    }
  }
}
