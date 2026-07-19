// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kernel } from '../kernel';

// A mock manifest reader
const mockReader = {
  exists: async () => true,
  listDirectories: async () => ['business-directory'],
  readJson: async (path: string) => {
    if (path.includes('plugin.json')) {
      return { id: 'saas.business-directory', version: '1.0.0', name: 'Business Directory' };
    }
    if (path.includes('routes.json')) {
      return [{ path: '/guia', page: 'DirectoryPage', permission: 'business.view' }];
    }
    if (path.includes('navigation.json')) {
      return [{ id: 'nav.guia', label: 'Guia', path: '/guia', order: 10, permission: 'business.view' }];
    }
    if (path.includes('widgets.json')) {
      return [{ id: 'widget.biz', slot: 'dashboard.main', component: 'BizWidget', order: 1 }];
    }
    if (path.includes('capabilities.json')) {
      return { provides: ['business.directory'] };
    }
    if (path.includes('slots.json')) {
      return [{ id: 'dashboard.main', description: 'Main Dashboard Slot' }];
    }
    if (path.includes('permissions.json')) {
      return [{ key: 'business.view', label: 'View Business' }];
    }
    return null;
  }
};

describe('Presentation Snapshot Architecture', () => {
  beforeEach(() => {
    Kernel.resetForTesting();
  });

  it('generates an immutable PresentationSnapshot DTO without React components', async () => {
    const civicOS = await Kernel.boot({
      pluginsDir: '/plugins',
      reader: mockReader as any,
      coreVersion: '1.0.0',
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    });

    const snapshot = civicOS.presentation().snapshot({
      tenantId: 'tenant-123',
      userId: 'user-456',
      locale: 'pt-BR',
      permissions: ['business.view'],
      capabilities: ['business.directory'],
      versions: {
        registryVersion: 1,
        capabilityVersion: 1,
        licenseVersion: 1,
        permissionVersion: 1,
        policyVersion: 1,
        layoutVersion: 1,
      }
    });

    // Verify it is completely immutable
    expect(Object.isFrozen(snapshot)).toBe(true);

    // Verify properties
    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.capabilities).toContain('business.directory');
    expect(snapshot.permissions).toContain('business.view');

    // Verify routes
    expect(snapshot.routes).toHaveLength(1);
    expect(snapshot.routes[0].path).toBe('/guia');
    expect(snapshot.routes[0].pluginId).toBe('saas.business-directory');
    expect((snapshot.routes[0] as any).component).toBeUndefined(); // Should NOT have React component

    // Verify navigation
    expect(snapshot.navigation).toHaveLength(1);
    expect(snapshot.navigation[0].id).toBe('nav.guia');
    expect(snapshot.navigation[0].path).toBe('/guia');

    // Verify widgets and slots
    expect(snapshot.widgets).toHaveLength(1);
    expect(snapshot.slots).toHaveLength(1);
    expect(snapshot.widgets[0].slot).toBe('dashboard.main');
  });
});
