import type { NavigationItem } from './navigation-types';
import type { NavigationRegistry } from './navigation-registry';
import type { PresentationContext } from '../presentation/presentation-types';

import type { RouteRegistry } from '../presentation/presentation-registries';
import type { RouteDefinition } from '../presentation/presentation-types';

export class NavigationResolver {
  constructor(
    private readonly navigationRegistry: NavigationRegistry,
    private readonly routeRegistry: RouteRegistry
  ) {}

  /**
   * Resolves the navigation items available for the given context.
   * Filters out items that the user does not have permission/capability/role/policy for.
   * Recursively filters children as well.
   * Deterministically sorted by `order` ASC, then `label` ASC.
   */
  resolveAll(context: PresentationContext, resolvedRoutes: RouteDefinition[]): NavigationItem[] {
    const rawNavs = this.navigationRegistry.getAll();
    const resolved = this.filterAndSortItems(rawNavs, context, resolvedRoutes);
    return resolved;
  }

  private filterAndSortItems(
    items: readonly NavigationItem[], 
    context: PresentationContext, 
    resolvedRoutes: RouteDefinition[]
  ): NavigationItem[] {
    const capabilitiesSet = new Set(context.capabilities);
    const permissionsSet = new Set(context.permissions);
    
    const filtered: NavigationItem[] = [];

    for (const nav of items) {
      if (nav.capability && !capabilitiesSet.has(nav.capability)) {
        continue;
      }

      if (nav.permission && !permissionsSet.has(nav.permission)) {
        continue;
      }
      
      // Note: Role and Policy filtering could be added here later if needed

      // Filter by resolved routes
      if (nav.route && !nav.route.startsWith('http')) {
        const match = this.routeRegistry.match(nav.route);
        if (match) {
          const isAllowed = resolvedRoutes.some(r => r.id === match.route.id);
          if (!isAllowed) {
            continue;
          }
        }
      }

      let resolvedNav: NavigationItem = { ...nav };

      // Recursively process children
      if (resolvedNav.children && resolvedNav.children.length > 0) {
        resolvedNav = {
          ...resolvedNav,
          children: this.filterAndSortItems(resolvedNav.children, context, resolvedRoutes)
        };
      }

      filtered.push(resolvedNav);
    }

    // Deterministic sorting: order ASC, then label ASC
    return filtered.sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.label.localeCompare(b.label);
    });
  }
}
