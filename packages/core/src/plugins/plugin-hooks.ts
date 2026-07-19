// ============================================================================
// Plugin Hooks — Plugin Runtime
// ============================================================================
// The lifecycle entrypoints that plugins can export.
// ============================================================================

import type { PluginContext } from './plugin-context';

export interface PluginLifecycleHooks {
  onInstall?: (ctx: PluginContext) => Promise<void> | void;
  onBoot?: (ctx: PluginContext) => Promise<void> | void;
  onEnable?: (ctx: PluginContext) => Promise<void> | void;
  onDisable?: (ctx: PluginContext) => Promise<void> | void;
  onSuspend?: (ctx: PluginContext) => Promise<void> | void;
  onResume?: (ctx: PluginContext) => Promise<void> | void;
  onShutdown?: (ctx: PluginContext) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext) => Promise<void> | void;
}
