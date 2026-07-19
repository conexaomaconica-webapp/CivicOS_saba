// ============================================================================
// Navigation Graph — Presentation Platform (AC-7A)
// ============================================================================

import type { DiagnosticsEngine } from '../diagnostics/diagnostics-engine';

import type { LayoutRegistry, NavigationRegistry, RouteRegistry, SlotRegistry, WidgetRegistry } from './presentation-registries';

export class NavigationGraphError extends Error {
  constructor(message: string) {
    super(`NavigationGraphError: ${message}`);
    this.name = 'NavigationGraphError';
  }
}

export class NavigationGraph {
  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly navigationRegistry: NavigationRegistry,
    private readonly widgetRegistry: WidgetRegistry,
    private readonly slotRegistry: SlotRegistry,
    private readonly layoutRegistry: LayoutRegistry,
    private readonly diagnostics: DiagnosticsEngine
  ) {}

  /**
   * Validates the integrity of the Presentation layer.
   * Throws NavigationGraphError on structural errors (ABORT BOOT).
   * Emits Diagnostics WARNINGs and mutations (dropping items) on referential errors.
   */
  validate(): void {
    this.checkStructuralIntegrity();
    this.checkReferentialIntegrity();
  }

  private checkStructuralIntegrity(): void {
    // 1. Check for circular dependencies in Navigation Menus
    const items = this.navigationRegistry.getAll();
    const visited = new Set<string>();
    const stack = new Set<string>();

    const checkCycle = (itemId: string) => {
      if (stack.has(itemId)) {
        throw new NavigationGraphError(`Circular dependency detected in navigation menu: "${itemId}"`);
      }
      if (visited.has(itemId)) return;

      visited.add(itemId);
      stack.add(itemId);

      const item = items.find(i => i.id === itemId);
      if (item && item.parentId) {
        checkCycle(item.parentId);
      }

      stack.delete(itemId);
    };

    for (const item of items) {
      checkCycle(item.id);
    }
  }

  private checkReferentialIntegrity(): void {
    // 1. Navigation Orphan Links (Referential Error)
    const items = this.navigationRegistry.getAll();
    for (const item of items) {
      if (!this.routeRegistry.get(item.path)) {
        // Drop from registry
        this.navigationRegistry.remove(item.id);
        
        // Report to diagnostics
        this.diagnostics.recordEvent(`Navigation Graph: Dropped orphan menu "${item.id}" pointing to "${item.path}"`);
        
        // We will fake a manual injection into Diagnostics Engine for now
        // In a real scenario, NavigationGraph might be a DiagnosticsContributor itself, 
        // but since this happens AT BOOT time (linter), we report it to the timeline and logs.
        console.warn(`[NAVIGATION] Orphan Menu Item dropped: "${item.id}" -> "${item.path}". Recommendation: Register route or remove menu entry.`);
      }
    }

    // 2. Widget pointing to non-existent slot
    const widgets = this.widgetRegistry.getAll();
    for (const widget of widgets) {
      if (!this.slotRegistry.has(widget.slot)) {
        throw new NavigationGraphError(`Widget "${widget.id}" points to non-existent slot "${widget.slot}".`);
      }
    }

    // 3. Route pointing to non-existent layout
    const routes = this.routeRegistry.getAll();
    for (const route of routes) {
      if (route.layoutId && !this.layoutRegistry.has(route.layoutId)) {
        throw new NavigationGraphError(`Route "${route.path}" points to non-existent layout "${route.layoutId}".`);
      }
    }
  }
}
