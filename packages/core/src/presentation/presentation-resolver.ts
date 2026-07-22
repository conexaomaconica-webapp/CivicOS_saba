// ============================================================================
// Presentation Resolver — Presentation Platform (AC-7A)
// ============================================================================

import type { PresentationContext, PresentationSnapshot, RouteDefinition } from './presentation-types';
import { NavigationResolver } from '../navigation/navigation-resolver';
import type { 
  WidgetRegistry, 
  SlotRegistry, 
  LayoutRegistry 
} from './presentation-registries';
import type { NavigationRegistry } from '../navigation/navigation-registry';
import type { RouteRegistry } from './presentation-registries';

export interface ResolvedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
  rewriteUrl: string;
}

export class PresentationResolver {
  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly navigationRegistry: NavigationRegistry,
    private readonly widgetRegistry: WidgetRegistry,
    private readonly slotRegistry: SlotRegistry,
    private readonly layoutRegistry: LayoutRegistry,
    private readonly platformVersion: string
  ) {}

  /**
   * Generates a frozen, immutable PresentationSnapshot tailored specifically
   * to the provided context (Tenant, Capabilities, Permissions).
   */
  resolve(context: PresentationContext): PresentationSnapshot {
    // 1. Filter Routes
    const resolvedRoutes = this.routeRegistry.getAll().filter(route => {
      if (route.requiredCapabilities && !route.requiredCapabilities.every(c => context.capabilities.includes(c))) {
        return false;
      }
      if (route.requiredPermissions && !route.requiredPermissions.every(p => context.permissions.includes(p))) {
        return false;
      }
      return true;
    });

    // 2. Resolve Navigation via NavigationResolver
    const navResolver = new NavigationResolver(this.navigationRegistry, this.routeRegistry);
    let resolvedNavigation = navResolver.resolveAll(context, resolvedRoutes);
    
    // Navigation filtering based on routes is now handled inside NavigationResolver

    // 3. Filter Widgets
    // Widgets might have custom visibility rules evaluated here (simplified for V1)
    const resolvedWidgets = this.widgetRegistry.getAll().filter(widget => {
      if (widget.requiredCapabilities && !widget.requiredCapabilities.every(c => context.capabilities.includes(c))) {
        return false;
      }
      if (widget.requiredPermissions && !widget.requiredPermissions.every(p => context.permissions.includes(p))) {
        return false;
      }
      return true;
    });

    // 4. Slots and Layouts are generally structural, we include all that are registered.
    const resolvedSlots = this.slotRegistry.getAll();
    const resolvedLayouts = this.layoutRegistry.getAll();

    const snapshot: PresentationSnapshot = {
      version: this.platformVersion,
      tenantId: context.tenantId,
      locale: context.locale,
      routes: resolvedRoutes,
      navigation: resolvedNavigation,
      widgets: resolvedWidgets,
      slots: resolvedSlots,
      layouts: resolvedLayouts,
      diagnostics: [],
      capabilities: context.capabilities,
      permissions: context.permissions,
      metadata: {},
    };

    return Object.freeze(snapshot);
  }
  
  /**
   * Resolves a dynamic request path to a physical route in a plugin.
   * Ensures the request context has the necessary permissions.
   */
  resolveRoute(context: PresentationContext, requestPath: string): ResolvedRoute | null {
    const match = this.routeRegistry.match(requestPath);
    
    if (!match) {
      return null; // Not found
    }
    
    const { route, params } = match;
    
    // Check capabilities
    if (route.requiredCapabilities && !route.requiredCapabilities.every(c => context.capabilities.includes(c))) {
      return null; // Forbidden
    }
    if (route.requiredPermissions && !route.requiredPermissions.every(p => context.permissions.includes(p))) {
      return null; // Forbidden
    }
    
    // Generate rewrite URL assuming `route.componentId` corresponds to the plugin's physical page
    // The componentId usually format: "plugin-id:page-name"
    const componentId = route.componentId || route.id;
    const [pluginId, pageId] = componentId.split(':');
    
    let rewriteUrl = `/plugins/${pluginId}/pages/${pageId}`;
    
    // Map params to query string
    const queryParts = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    if (queryParts.length > 0) {
      rewriteUrl += `?${queryParts.join('&')}`;
    }
    
    return {
      route,
      params,
      rewriteUrl
    };
  }
}
