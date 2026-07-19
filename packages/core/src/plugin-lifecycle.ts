// ============================================================================
// Plugin Lifecycle Manager — Core Kernel
// ============================================================================
// Manages the official state machine for each plugin in a tenant context:
//
//   DISCOVERED → INSTALLED → VALIDATED → MIGRATED → LICENSED →
//   CONFIGURED → ACTIVE → PUBLIC
//
// Plus error/deprecation states:
//   DISABLED, ERROR, DEPRECATED, REMOVED
//
// INVARIANT: This module contains ZERO business logic.
// It orchestrates transitions and emits events, nothing more.
// ============================================================================

// ---------------------------------------------------------------------------
// Plugin Lifecycle States
// ---------------------------------------------------------------------------

export type PluginLifecycleState =
  | 'discovered'
  | 'installed'
  | 'validated'
  | 'migrated'
  | 'licensed'
  | 'configured'
  | 'active'
  | 'public'
  | 'disabled'
  | 'suspended'
  | 'error'
  | 'deprecated'
  | 'removed'
  | 'uninstalled';

// ---------------------------------------------------------------------------
// Transition Map (legal transitions)
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<PluginLifecycleState, readonly PluginLifecycleState[]> = {
  discovered: ['installed', 'error', 'removed'],
  installed: ['validated', 'error', 'removed', 'uninstalled'],
  validated: ['migrated', 'error', 'removed', 'uninstalled'],
  migrated: ['licensed', 'error', 'removed', 'uninstalled'],
  licensed: ['configured', 'error', 'removed', 'uninstalled'],
  configured: ['active', 'error', 'removed', 'uninstalled'],
  active: ['public', 'disabled', 'suspended', 'deprecated', 'error'],
  public: ['active', 'disabled', 'suspended', 'deprecated', 'error'],
  disabled: ['active', 'removed', 'uninstalled', 'error'],
  suspended: ['active', 'disabled', 'uninstalled', 'error'],
  error: ['installed', 'removed', 'uninstalled'],
  deprecated: ['removed', 'uninstalled'],
  removed: [],
  uninstalled: [],
};

// ---------------------------------------------------------------------------
// Plugin Lifecycle Entry
// ---------------------------------------------------------------------------

export interface LifecycleEntry {
  readonly pluginId: string;
  state: PluginLifecycleState;
  error?: string;
  readonly history: Array<{
    readonly from: PluginLifecycleState;
    readonly to: PluginLifecycleState;
    readonly timestamp: number;
    readonly reason?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Lifecycle Event Callback
// ---------------------------------------------------------------------------

export type LifecycleEventHandler = (
  pluginId: string,
  from: PluginLifecycleState,
  to: PluginLifecycleState,
  reason?: string,
) => void;

// ---------------------------------------------------------------------------
// Plugin Lifecycle Manager
// ---------------------------------------------------------------------------

export class PluginLifecycleManager {
  private readonly entries = new Map<string, LifecycleEntry>();
  private readonly listeners: LifecycleEventHandler[] = [];

  /**
   * Register a newly discovered plugin.
   */
  discover(pluginId: string): void {
    if (this.entries.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already tracked by the lifecycle manager`);
    }
    this.entries.set(pluginId, {
      pluginId,
      state: 'discovered',
      history: [],
    });
  }

  /**
   * Transition a plugin to a new state.
   * Throws if the transition is illegal.
   */
  transition(pluginId: string, to: PluginLifecycleState, reason?: string): void {
    const entry = this.entries.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin "${pluginId}" is not tracked by the lifecycle manager`);
    }

    const from = entry.state;
    const allowed = TRANSITIONS[from];

    if (!allowed.includes(to)) {
      throw new Error(
        `Illegal lifecycle transition for "${pluginId}": ${from} → ${to}. ` +
        `Allowed: [${allowed.join(', ')}]`
      );
    }

    // Record transition
    entry.history.push({
      from,
      to,
      timestamp: Date.now(),
      reason,
    });

    entry.state = to;

    if (to === 'error' && reason) {
      entry.error = reason;
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(pluginId, from, to, reason);
    }
  }

  /**
   * Convenience: advance a plugin through the happy path:
   * discovered → installed → validated → migrated → licensed → configured → active
   */
  advanceToActive(pluginId: string): void {
    const happyPath: PluginLifecycleState[] = [
      'installed', 'validated', 'migrated', 'licensed', 'configured', 'active',
    ];
    for (const state of happyPath) {
      const entry = this.entries.get(pluginId);
      if (!entry) break;
      if (entry.state === state || entry.state === 'active') break;
      this.transition(pluginId, state);
    }
  }

  /**
   * Subscribe to lifecycle transition events.
   */
  onTransition(handler: LifecycleEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      const idx = this.listeners.indexOf(handler);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Get the current state of a plugin.
   */
  getState(pluginId: string): PluginLifecycleState | undefined {
    return this.entries.get(pluginId)?.state;
  }

  /**
   * Get the full lifecycle entry for a plugin.
   */
  getEntry(pluginId: string): LifecycleEntry | undefined {
    return this.entries.get(pluginId);
  }

  /**
   * List all plugins in a given state.
   */
  listByState(state: PluginLifecycleState): string[] {
    return Array.from(this.entries.values())
      .filter((e) => e.state === state)
      .map((e) => e.pluginId);
  }

  /**
   * List all tracked plugins and their states.
   */
  listAll(): ReadonlyMap<string, PluginLifecycleState> {
    const map = new Map<string, PluginLifecycleState>();
    for (const [id, entry] of this.entries) {
      map.set(id, entry.state);
    }
    return map;
  }
}
