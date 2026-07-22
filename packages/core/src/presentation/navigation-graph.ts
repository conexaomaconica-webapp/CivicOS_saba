// ============================================================================
// Navigation Graph — Presentation Platform (AC-7A)
// ============================================================================

import type { DiagnosticsEngine } from '../diagnostics/diagnostics-engine';

import type { LayoutRegistry, RouteRegistry, SlotRegistry, WidgetRegistry } from './presentation-registries';
import type { NavigationRegistry } from '../navigation/navigation-registry';
import type { NavigationItem } from '../navigation/navigation-types';

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
    // With the new nested `children` structure, infinite recursion is possible if the JS object graph is circular.
    // JSON.stringify in snapshot() would fail, but we'll do a basic tree traversal.
    const items = this.navigationRegistry.getAll();
    const visited = new Set<NavigationItem>();

    const checkCycle = (item: NavigationItem) => {
      if (visited.has(item)) {
        throw new NavigationGraphError(`Circular dependency detected in navigation menu object: "${item.id}"`);
      }
      visited.add(item);
      
      if (item.children) {
        for (const child of item.children) {
          checkCycle(child);
        }
      }
      visited.delete(item);
    };

    for (const item of items) {
      checkCycle(item);
    }
  }

  private checkReferentialIntegrity(): void {
    // 1. Navigation Orphan Links (Referential Error)
    const items = this.navigationRegistry.getAll();
    
    const checkItem = (item: NavigationItem, parentId?: string) => {
      // Safely handle missing route (e.g. from tests or invalid manifests)
      if (!item.route) return;
      
      // Allow external links
      if (item.route.startsWith('http')) return;
      
      if (!this.routeRegistry.get(item.route)) {
        // Drop from registry (note: this currently removes the ROOT item if any child fails. For a robust impl, we'd need a deep prune)
        const idToRemove = parentId || item.id;
        this.navigationRegistry.remove(idToRemove);
        
        // Report to diagnostics
        this.diagnostics.recordEvent(`Navigation Graph: Dropped orphan menu "${item.id}" pointing to "${item.route}"`);
        
        console.warn(`[NAVIGATION] Orphan Menu Item dropped: "${item.id}" -> "${item.route}". Recommendation: Register route or remove menu entry.`);
      }
      
      if (item.children) {
        for (const child of item.children) {
          checkItem(child, parentId || item.id);
        }
      }
    };
    
    // We clone to avoid modifying while iterating
    const itemsToCheck = [...items];
    for (const item of itemsToCheck) {
      checkItem(item);
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
