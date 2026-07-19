import type { PresentationContext, NavigationItem, RouteDefinition } from '../presentation-types';
import type { NavigationRegistry } from '../presentation-registries';

export class NavigationResolver {
  constructor(private readonly navigationRegistry: NavigationRegistry) {}

  /**
   * Resolves the navigation items available for the given context.
   * Only includes items whose target paths are present in the resolvedRoutes.
   * Deterministically sorted by `priority` ASC, then `label` ASC.
   */
  resolveAll(
    context: PresentationContext,
    resolvedRoutes: readonly RouteDefinition[]
  ): NavigationItem[] {
    const rawNavs = this.navigationRegistry.getAll();
    const resolved: NavigationItem[] = [];

    const capabilitiesSet = new Set(context.capabilities);
    const permissionsSet = new Set(context.permissions);
    
    // Fast lookup for allowed routes
    const allowedPaths = new Set(resolvedRoutes.map(r => r.path));

    for (const nav of rawNavs) {
      if (nav.requiredCapabilities && nav.requiredCapabilities.length > 0) {
        const hasAllCaps = nav.requiredCapabilities.every(cap => capabilitiesSet.has(cap));
        if (!hasAllCaps) continue;
      }

      if (nav.requiredPermissions && nav.requiredPermissions.length > 0) {
        const hasAllPerms = nav.requiredPermissions.every(perm => permissionsSet.has(perm));
        if (!hasAllPerms) continue;
      }

      // Check if the navigation target path is accessible (must be in resolvedRoutes)
      // If path starts with 'http', it's external, we allow it. Otherwise, must be in allowedPaths.
      if (!nav.path.startsWith('http') && !allowedPaths.has(nav.path)) {
        continue;
      }

      resolved.push(nav);
    }

    // Deterministic sorting: priority ASC, then label ASC
    return resolved.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.label.localeCompare(b.label);
    });
  }
}
