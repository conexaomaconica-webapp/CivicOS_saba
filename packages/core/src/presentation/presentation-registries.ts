import { BaseRegistry } from '../base-registry';
import type { 
  LayoutDefinition,
  RouteDefinition, 
  SlotDefinition, 
  WidgetDefinition 
} from './presentation-types';

export interface RouteMatchResult {
  route: RouteDefinition;
  params: Record<string, string>;
}

export class RouteRegistry extends BaseRegistry<RouteDefinition[]> {
  private readonly routes = new Map<string, RouteDefinition>();

  register(route: RouteDefinition): void {
    this.assertNotFrozen();
    
    // We reject duplicates structurally
    if (this.routes.has(route.path)) {
      throw new Error(`Route path "${route.path}" is already registered.`);
    }
    
    this.routes.set(route.path, route);
    this.incrementVersion();
  }

  getAll(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  get(path: string): RouteDefinition | undefined {
    return this.routes.get(path);
  }

  /**
   * Matches a request path against registered routes supporting Express-like parameters (e.g. /path/:id/edit)
   */
  match(requestPath: string): RouteMatchResult | null {
    // Simple static match first
    if (this.routes.has(requestPath)) {
      return { route: this.routes.get(requestPath)!, params: {} };
    }

    // Dynamic match
    for (const [routePath, route] of this.routes.entries()) {
      if (!routePath.includes(':')) continue;

      const paramNames: string[] = [];
      const regexPath = routePath.replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });
      const regex = new RegExp(`^${regexPath}$`);
      const match = requestPath.match(regex);

      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          const val = match[i + 1];
          params[name] = val !== undefined ? val : '';
        });
        return { route, params };
      }
    }

    return null;
  }

  snapshot(): RouteDefinition[] {
    return Array.from(this.routes.values()).map(r => structuredClone(r));
  }
}



export class WidgetRegistry extends BaseRegistry<WidgetDefinition[]> {
  private readonly widgets = new Map<string, WidgetDefinition>();

  register(widget: WidgetDefinition): void {
    this.assertNotFrozen();
    
    if (this.widgets.has(widget.id)) {
      throw new Error(`Widget ID "${widget.id}" is already registered.`);
    }
    
    this.widgets.set(widget.id, widget);
    this.incrementVersion();
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  snapshot(): WidgetDefinition[] {
    return Array.from(this.widgets.values()).map(w => structuredClone(w));
  }
}

export class SlotRegistry extends BaseRegistry<SlotDefinition[]> {
  private readonly slots = new Map<string, SlotDefinition>();

  register(slot: SlotDefinition): void {
    this.assertNotFrozen();
    
    if (this.slots.has(slot.id)) {
      throw new Error(`Slot ID "${slot.id}" is already registered.`);
    }
    
    this.slots.set(slot.id, slot);
    this.incrementVersion();
  }

  getAll(): SlotDefinition[] {
    return Array.from(this.slots.values());
  }
  
  has(id: string): boolean {
    return this.slots.has(id);
  }

  snapshot(): SlotDefinition[] {
    return Array.from(this.slots.values()).map(s => structuredClone(s));
  }
}

export class LayoutRegistry extends BaseRegistry<LayoutDefinition[]> {
  private readonly layouts = new Map<string, LayoutDefinition>();

  register(layout: LayoutDefinition): void {
    this.assertNotFrozen();
    
    if (this.layouts.has(layout.id)) {
      throw new Error(`Layout ID "${layout.id}" is already registered.`);
    }
    
    this.layouts.set(layout.id, layout);
    this.incrementVersion();
  }

  getAll(): LayoutDefinition[] {
    return Array.from(this.layouts.values());
  }

  has(id: string): boolean {
    return this.layouts.has(id);
  }

  snapshot(): LayoutDefinition[] {
    return Array.from(this.layouts.values()).map(l => structuredClone(l));
  }
}
