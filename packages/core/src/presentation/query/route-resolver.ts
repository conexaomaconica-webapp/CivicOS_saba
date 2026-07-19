import type { PresentationContext, RouteDefinition } from '../presentation-types';
import type { RouteRegistry } from '../presentation-registries';

export class RouteResolver {
  constructor(private readonly routeRegistry: RouteRegistry) {}

  /**
   * Resolves the complete list of available routes for the given context.
   * Deterministically sorted by `path` ASC.
   */
  resolveAll(context: PresentationContext): RouteDefinition[] {
    const rawRoutes = this.routeRegistry.getAll();
    const resolved: RouteDefinition[] = [];

    const capabilitiesSet = new Set(context.capabilities);
    const permissionsSet = new Set(context.permissions);

    for (const route of rawRoutes) {
      if (route.requiredCapabilities && route.requiredCapabilities.length > 0) {
        const hasAllCaps = route.requiredCapabilities.every(cap => capabilitiesSet.has(cap));
        if (!hasAllCaps) continue;
      }

      if (route.requiredPermissions && route.requiredPermissions.length > 0) {
        const hasAllPerms = route.requiredPermissions.every(perm => permissionsSet.has(perm));
        if (!hasAllPerms) continue;
      }

      resolved.push(route);
    }

    // Deterministic sorting: path ASC
    return resolved.sort((a, b) => a.path.localeCompare(b.path));
  }
}
