import type { LayoutDefinition } from '../presentation-types';
import type { LayoutRegistry } from '../presentation-registries';

export class LayoutResolver {
  constructor(private readonly layoutRegistry: LayoutRegistry) {}

  /**
   * Resolves all available layouts.
   * Deterministically sorted by `id` ASC.
   */
  resolveAll(): LayoutDefinition[] {
    const rawLayouts = this.layoutRegistry.getAll();
    
    // Clone and sort
    return [...rawLayouts].sort((a, b) => a.id.localeCompare(b.id));
  }
}
