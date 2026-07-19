import type { PresentationContext, PresentationSnapshot, SlotDefinition } from '../presentation-types';
import type { RouteResolver } from './route-resolver';
import type { NavigationResolver } from './navigation-resolver';
import type { LayoutResolver } from './layout-resolver';
import type { WidgetResolver } from './widget-resolver';
import type { SlotRegistry } from '../presentation-registries';

export class PresentationSnapshotBuilder {
  constructor(
    private readonly routeResolver: RouteResolver,
    private readonly navigationResolver: NavigationResolver,
    private readonly layoutResolver: LayoutResolver,
    private readonly widgetResolver: WidgetResolver,
    private readonly slotRegistry: SlotRegistry,
    private readonly coreVersion: string
  ) {}

  /**
   * Builds the official, immutable, and deterministic PresentationSnapshot for the given context.
   */
  build(context: PresentationContext): PresentationSnapshot {
    const routes = this.routeResolver.resolveAll(context);
    const navigation = this.navigationResolver.resolveAll(context, routes);
    const layouts = this.layoutResolver.resolveAll();
    const widgets = this.widgetResolver.resolveAll(context);

    // Slots are just definitions, they don't depend on capabilities typically,
    // but they should be deterministically sorted.
    const slots: SlotDefinition[] = this.slotRegistry.getAll().sort((a, b) => a.id.localeCompare(b.id));

    // Construct the snapshot.
    // Notice that there is NO generatedAt or any non-deterministic field.
    const snapshot: PresentationSnapshot = {
      version: this.coreVersion,
      tenantId: context.tenantId,
      locale: context.locale,
      routes,
      navigation,
      widgets,
      slots,
      layouts,
      diagnostics: [], // The query runtime could populate this if necessary, but typically left empty here.
      capabilities: context.capabilities,
      permissions: context.permissions,
      metadata: {},
    };

    // Make the snapshot deeply immutable
    return this.deepFreeze(snapshot);
  }

  private deepFreeze<T>(obj: T): T {
    if (obj && typeof obj === 'object') {
      Object.freeze(obj);
      for (const key of Object.getOwnPropertyNames(obj)) {
        const prop = (obj as any)[key];
        if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
          this.deepFreeze(prop);
        }
      }
    }
    return obj;
  }
}
