// ============================================================================
// Permission Engine — Core Kernel
// ============================================================================
// Validates whether a plugin is authorized to access certain platform services.
// Operates based on the `runtime.services` declaration in the PluginManifest.
// ============================================================================

import type { PluginManifest } from '../plugin-registry';

export class PermissionEngine {
  private readonly allowedServicesByPlugin = new Map<string, Set<string>>();

  /**
   * Initializes the engine with the list of loaded manifests.
   */
  initialize(manifests: readonly PluginManifest[]): void {
    this.allowedServicesByPlugin.clear();
    for (const m of manifests) {
      const allowedServices = new Set<string>();
      if (m.runtime?.services) {
        for (const svc of m.runtime.services) {
          allowedServices.add(svc);
        }
      }
      this.allowedServicesByPlugin.set(m.id, allowedServices);
    }
  }

  /**
   * Returns true if the plugin has declared intention to use the specified service.
   */
  canAccessService(pluginId: string, serviceName: string): boolean {
    const allowed = this.allowedServicesByPlugin.get(pluginId);
    return allowed ? allowed.has(serviceName) : false;
  }
}
