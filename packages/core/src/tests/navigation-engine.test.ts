// ============================================================================
// Navigation Engine — Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { NavigationResolver } from '../navigation/navigation-resolver';
import { NavigationRegistry } from '../navigation/navigation-registry';
import { RouteRegistry } from '../presentation/presentation-registries';
import type { PresentationContext } from '../presentation/presentation-types';

describe('NavigationEngine (Sprint 1.0)', () => {
  it('filters navigation items by permissions, capabilities, and sorts deterministically', () => {
    const navRegistry = new NavigationRegistry();
    const routeRegistry = new RouteRegistry();

    // Register routes
    routeRegistry.register({
      id: 'route-dashboard',
      path: '/dashboard',
      requireAuth: true,
    });
    routeRegistry.register({
      id: 'route-admin',
      path: '/admin',
      requireAuth: true,
      requiredPermissions: ['admin:access'],
    });

    // Register nav items
    navRegistry.register({
      id: 'nav-dashboard',
      label: 'Painel',
      route: '/dashboard',
      order: 10,
    });
    navRegistry.register({
      id: 'nav-admin',
      label: 'Administração',
      route: '/admin',
      permission: 'admin:access',
      order: 20,
    });
    navRegistry.register({
      id: 'nav-founders',
      label: 'Fundadores',
      route: '/admin/fundadores',
      capability: 'founder-program',
      order: 30,
    });

    const resolver = new NavigationResolver(navRegistry, routeRegistry);

    // Context without admin permission or founder capability
    const guestContext: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: [],
      permissions: [],
      versions: {
        registryVersion: 1,
        capabilityVersion: 1,
        licenseVersion: 1,
        permissionVersion: 1,
        policyVersion: 1,
        layoutVersion: 1,
      },
    };

    const resolvedRoutesGuest = [
      { id: 'route-dashboard', path: '/dashboard', requireAuth: true }
    ];

    const guestNavs = resolver.resolveAll(guestContext, resolvedRoutesGuest);
    expect(guestNavs).toHaveLength(1);
    expect(guestNavs[0].id).toBe('nav-dashboard');

    // Context with admin permission and founder capability
    const adminContext: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: ['founder-program'],
      permissions: ['admin:access'],
      versions: {
        registryVersion: 1,
        capabilityVersion: 1,
        licenseVersion: 1,
        permissionVersion: 1,
        policyVersion: 1,
        layoutVersion: 1,
      },
    };

    const resolvedRoutesAdmin = [
      { id: 'route-dashboard', path: '/dashboard', requireAuth: true },
      { id: 'route-admin', path: '/admin', requireAuth: true }
    ];

    const adminNavs = resolver.resolveAll(adminContext, resolvedRoutesAdmin);
    expect(adminNavs.map(n => n.id)).toEqual(['nav-dashboard', 'nav-admin', 'nav-founders']);
  });
});
