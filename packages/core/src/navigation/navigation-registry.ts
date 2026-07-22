import { BaseRegistry } from '../base-registry';
import type { NavigationItem } from './navigation-types';

export class NavigationRegistry extends BaseRegistry<NavigationItem[]> {
  private readonly items = new Map<string, NavigationItem>();

  register(item: NavigationItem): void {
    this.assertNotFrozen();
    
    if (this.items.has(item.id)) {
      throw new Error(`Navigation item ID "${item.id}" is already registered.`);
    }
    
    this.items.set(item.id, item);
    this.incrementVersion();
  }

  getAll(): NavigationItem[] {
    return Array.from(this.items.values());
  }

  remove(id: string): void {
    this.assertNotFrozen();
    this.items.delete(id);
    this.incrementVersion();
  }

  snapshot(): NavigationItem[] {
    // deep clone to prevent mutations
    return JSON.parse(JSON.stringify(Array.from(this.items.values())));
  }
}
