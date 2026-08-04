// ============================================================================
// Registry Manager — Core Kernel
// ============================================================================

import type { FullLoadedManifest, ManifestRouteEntry, ManifestWidgetEntry, ManifestNavigationEntry } from './manifest-loader';
import { BaseRegistry } from './base-registry';
import { CapabilityRegistry } from './capabilities/capability-registry';
import { RouteRegistry, WidgetRegistry, SlotRegistry, LayoutRegistry } from './presentation/presentation-registries';
import { NavigationRegistry } from './navigation/navigation-registry';

export interface RegisteredPermission {
  readonly pluginId: string;
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export interface RegisteredSetting {
  readonly pluginId: string;
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly defaultValue: unknown;
  readonly capability?: string;
}

export class PermissionRegistry extends BaseRegistry<RegisteredPermission[]> {
  private readonly permissions: RegisteredPermission[] = [];

  register(perm: RegisteredPermission): void {
    this.assertNotFrozen();
    this.permissions.push(perm);
    this.incrementVersion();
  }

  getAll(): RegisteredPermission[] {
    return this.permissions;
  }

  snapshot(): RegisteredPermission[] {
    return structuredClone(this.permissions);
  }
}

export class SettingsRegistry extends BaseRegistry<RegisteredSetting[]> {
  private readonly settings: RegisteredSetting[] = [];

  register(setting: RegisteredSetting): void {
    this.assertNotFrozen();
    this.settings.push(setting);
    this.incrementVersion();
  }

  getAll(): RegisteredSetting[] {
    return this.settings;
  }

  snapshot(): RegisteredSetting[] {
    return structuredClone(this.settings);
  }
}

export class RegistryManager {
  readonly capabilities = new CapabilityRegistry();
  readonly permissions = new PermissionRegistry();
  readonly settings = new SettingsRegistry();

  readonly presentationRoutes = new RouteRegistry();
  readonly presentationNavigation = new NavigationRegistry();
  readonly presentationWidgets = new WidgetRegistry();
  readonly presentationSlots = new SlotRegistry();
  readonly presentationLayouts = new LayoutRegistry();

  freeze(): void {
    this.capabilities.freeze();
    this.permissions.freeze();
    this.settings.freeze();
    
    this.presentationRoutes.freeze();
    this.presentationNavigation.freeze();
    this.presentationWidgets.freeze();
    this.presentationSlots.freeze();
    this.presentationLayouts.freeze();
  }

  populateFromManifests(manifests: readonly FullLoadedManifest[]): void {
    for (const manifest of manifests) {
      this.populatePlugin(manifest.plugin.id, manifest);
    }
  }

  private populatePlugin(pluginId: string, manifest: FullLoadedManifest): void {
    console.log('Populate plugin:', pluginId, 'routes:', manifest.routes);
    // -- Capabilities
    if (manifest.capabilities?.provides) {
      for (const cap of manifest.capabilities.provides) {
        const id = typeof cap === 'string' ? cap : cap.id;
        const type = typeof cap === 'string' ? 'service' : (cap.type ?? 'service');
        this.capabilities.registerProvides({ id, type, provider: pluginId, version: manifest.plugin.version });
      }
    }
    if (manifest.capabilities?.requires) {
      this.capabilities.registerRequires(pluginId, manifest.capabilities.requires);
    }

    // -- Routes
    if (manifest.routes) {
      for (const route of manifest.routes) {
        const r = route as ManifestRouteEntry & { pathname?: string; componentId?: string };
        const pathStr = r.path ?? r.pathname;
        if (!pathStr) continue;

        this.presentationRoutes.register({
          id: `${pluginId}:${pathStr}`,
          path: pathStr,
          componentId: r.page ?? r.componentId,
          layoutId: r.layout,
          requireAuth: !r.public,
          requiredCapabilities: r.capability ? [r.capability] : undefined,
          requiredPermissions: r.permission ? [r.permission] : undefined,
        });
      }
    }

    // -- Widgets
    if (manifest.widgets) {
      for (const widget of manifest.widgets) {
        const w = widget as ManifestWidgetEntry & { zone?: string; componentId?: string; priority?: number };
        const slotId = w.slot ?? w.zone;
        if (!slotId) continue;

        if (!this.presentationSlots.has(slotId)) {
          this.presentationSlots.register({ id: slotId, description: `Slot ${slotId}` });
        }

        this.presentationWidgets.register({
          id: `${pluginId}:${w.id}`,
          componentId: w.component ?? w.componentId ?? '',
          slot: slotId,
          priority: w.order ?? w.priority ?? 0,
        });
      }
    }

    // -- Navigation
    if (manifest.navigation) {
      for (const nav of manifest.navigation) {
        const n = nav as ManifestNavigationEntry;
        this.presentationNavigation.register({
          id: `${pluginId}:${n.id}`,
          label: n.label ?? '',
          route: (n as any).route || n.path,
          icon: n.icon,
          order: n.order ?? 0,
          permission: n.permission,
        });
      }
    }

    // -- Permissions
    if (manifest.permissions) {
      for (const perm of manifest.permissions) {
        this.permissions.register({ pluginId, key: perm.key, label: perm.label, description: perm.description });
      }
    }

    // -- Settings
    if (manifest.settings) {
      for (const setting of manifest.settings) {
        this.settings.register({ pluginId, key: setting.key, label: setting.label, type: setting.type, defaultValue: setting.default, capability: setting.capability });
      }
    }

    // -- Slots
    if (manifest.slots) {
      for (const slot of manifest.slots) {
        if (!this.presentationSlots.has(slot.id)) {
          this.presentationSlots.register({
            id: slot.id,
            description: slot.description
          });
        }
      }
    }

    // -- Layouts
    if (manifest.layouts) {
      for (const layout of manifest.layouts) {
        if (!this.presentationLayouts.has(layout.id)) {
          this.presentationLayouts.register({
            id: layout.id,
            componentId: layout.component,
            slots: layout.slots
          });
        }
      }
    }
  }
}
