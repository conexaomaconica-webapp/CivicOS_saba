// ============================================================================
// Plugin Health — Plugin Runtime
// ============================================================================
// Defines the health report structure for individual plugins.
// ============================================================================

export interface PluginHealthReport {
  readonly pluginId: string;
  readonly version: string;
  readonly state: 'installed' | 'booted' | 'enabled' | 'suspended' | 'disabled' | 'failed';
  readonly bootTime: number;
  readonly dependencies: readonly string[];
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
  readonly services: readonly string[];
  readonly warnings: readonly string[];
  readonly violations: readonly string[];
  readonly score: number; // 0-100
}
