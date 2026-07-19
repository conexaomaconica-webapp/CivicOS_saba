// ============================================================================
// Core Events — CivicOS
// ============================================================================
// Defines the strict types for Infrastructure Events emitted by the Kernel
// and Platform components.
// ============================================================================

export interface KernelBootStarted {
  readonly coreVersion: string;
  readonly timestamp: number;
}

export interface KernelBootCompleted {
  readonly durationMs: number;
  readonly activePlugins: number;
}

export interface PluginDiscovered {
  readonly pluginId: string;
  readonly version: string;
}

export interface PluginValidationFailed {
  readonly pluginId: string;
  readonly errors: string[];
}

export interface RegistryUpdated {
  readonly registryName: string;
  readonly version: number;
}

export interface CoreEvents {
  'kernel.boot.started': KernelBootStarted;
  'kernel.boot.completed': KernelBootCompleted;
  'plugin.discovered': PluginDiscovered;
  'plugin.validation.failed': PluginValidationFailed;
  'registry.updated': RegistryUpdated;
}

/**
 * Empty interface for Declaration Merging.
 * Plugins will extend this interface using `declare module '@saas/core'`.
 */
export interface PluginEvents {}

/**
 * The final union of all valid events in the system.
 * 
 * @version 1.0.0 (Platform Freeze)
 * @stable
 */
export type CivicEvents = CoreEvents & PluginEvents;

/**
 * Utility type to extract the payload for a given event name.
 */
export type EventPayload<T extends keyof CivicEvents> = CivicEvents[T];
