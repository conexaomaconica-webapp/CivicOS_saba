// ============================================================================
// Service Resolver — Plugin Runtime
// ============================================================================
// Provides a secure facade over the Kernel's DI Container.
// Plugins use this to request service contracts by name.
// Interacts with PermissionEngine to enforce fail-fast access control.
// ============================================================================

import type { Container } from '../di/container';
import { PermissionEngine } from '../permissions/permission-engine';

export class ServiceResolver {
  constructor(
    private readonly pluginId: string,
    private readonly container: Container,
    private readonly permissionEngine: PermissionEngine
  ) {}

  /**
   * Resolves a platform service by its contract name.
   * Throws an error immediately if the plugin lacks permission.
   * Throws an error if the service is not found in the DI Container.
   */
  resolve<T>(serviceName: string): T {
    // 1. Check Permissions (Fail-Fast)
    if (!this.permissionEngine.canAccessService(this.pluginId, serviceName)) {
      throw new Error(
        `Permission Denied: Plugin "${this.pluginId}" is not authorized to access service "${serviceName}". ` +
        `Ensure it is declared in the "runtime.services" block of the plugin.json manifesto.`
      );
    }

    // 2. Resolve from DI Container
    // We map string service names to standard Tokens used in DI.
    // In a real system, the DI container tokens would be accessible via a registry.
    // For simplicity, we assume the Token's description matches the serviceName exactly.
    // However, our Container resolve uses strictly typed Tokens. We need a way to look them up.
    
    // We can iterate over the container's registered tokens, or require the container
    // to expose a resolveByName method. Let's add resolveByName to the Container.
    const instance = this.container.resolveByName<T>(serviceName);
    
    if (!instance) {
      throw new Error(`Service "${serviceName}" could not be found in the Platform DI Container.`);
    }

    return instance;
  }
}
