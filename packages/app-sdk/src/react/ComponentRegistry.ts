import { ComponentType } from 'react';

/**
 * Registry to associate CivicOS Presentation Engine definition IDs (e.g., 'business.lifecycle.summary')
 * with concrete React components in the Host Application.
 */
class ComponentRegistryManager {
  private pages = new Map<string, ComponentType<any>>();
  private widgets = new Map<string, ComponentType<any>>();
  private layouts = new Map<string, ComponentType<any>>();
  private slots = new Map<string, ComponentType<any>>();

  registerPage(id: string, component: ComponentType<any>): void {
    this.pages.set(id, component);
  }

  getPage(id: string): ComponentType<any> | undefined {
    return this.pages.get(id);
  }

  registerWidget(id: string, component: ComponentType<any>): void {
    this.widgets.set(id, component);
  }

  getWidget(id: string): ComponentType<any> | undefined {
    return this.widgets.get(id);
  }

  registerLayout(id: string, component: ComponentType<any>): void {
    this.layouts.set(id, component);
  }

  getLayout(id: string): ComponentType<any> | undefined {
    return this.layouts.get(id);
  }

  registerSlot(id: string, component: ComponentType<any>): void {
    this.slots.set(id, component);
  }

  getSlot(id: string): ComponentType<any> | undefined {
    return this.slots.get(id);
  }

  clear(): void {
    this.pages.clear();
    this.widgets.clear();
    this.layouts.clear();
    this.slots.clear();
  }
}

export const ComponentRegistry = new ComponentRegistryManager();
