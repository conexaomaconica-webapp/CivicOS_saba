import type { PresentationContext, WidgetDefinition } from '../presentation-types';
import type { WidgetRegistry } from '../presentation-registries';

export class WidgetResolver {
  constructor(private readonly widgetRegistry: WidgetRegistry) {}

  /**
   * Resolves the complete list of available widgets for the given context.
   * Deterministically sorted by `slot` ASC, `priority` DESC, `id` ASC.
   */
  resolveAll(context: PresentationContext): WidgetDefinition[] {
    const rawWidgets = this.widgetRegistry.getAll();
    const resolved: WidgetDefinition[] = [];

    const capabilitiesSet = new Set(context.capabilities);
    const permissionsSet = new Set(context.permissions);

    for (const widget of rawWidgets) {
      if (widget.requiredCapabilities && widget.requiredCapabilities.length > 0) {
        const hasAllCaps = widget.requiredCapabilities.every(cap => capabilitiesSet.has(cap));
        if (!hasAllCaps) continue;
      }

      if (widget.requiredPermissions && widget.requiredPermissions.length > 0) {
        const hasAllPerms = widget.requiredPermissions.every(perm => permissionsSet.has(perm));
        if (!hasAllPerms) continue;
      }

      resolved.push(widget);
    }

    // Deterministic sorting: slot ASC, priority DESC, id ASC
    return resolved.sort((a, b) => {
      const slotDiff = a.slot.localeCompare(b.slot);
      if (slotDiff !== 0) return slotDiff;
      
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.id.localeCompare(b.id);
    });
  }
}
