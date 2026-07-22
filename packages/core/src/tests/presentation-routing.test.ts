// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { RouteRegistry, WidgetRegistry, SlotRegistry, LayoutRegistry } from '../presentation/presentation-registries';
import { NavigationRegistry } from '../navigation/navigation-registry';
import { PresentationResolver } from '../presentation/presentation-resolver';
import type { PresentationContext } from '../presentation/presentation-types';

describe('Presentation Routing & Resolver', () => {
  let routeRegistry: RouteRegistry;
  let navigationRegistry: NavigationRegistry;
  let widgetRegistry: WidgetRegistry;
  let slotRegistry: SlotRegistry;
  let layoutRegistry: LayoutRegistry;
  let resolver: PresentationResolver;

  beforeEach(() => {
    routeRegistry = new RouteRegistry();
    navigationRegistry = new NavigationRegistry();
    widgetRegistry = new WidgetRegistry();
    slotRegistry = new SlotRegistry();
    layoutRegistry = new LayoutRegistry();
    resolver = new PresentationResolver(
      routeRegistry,
      navigationRegistry,
      widgetRegistry,
      slotRegistry,
      layoutRegistry,
      '1.0.0'
    );
  });

  it('resolves dynamic route with path parameters and correctly maps to rewrite URL', () => {
    routeRegistry.register({
      id: 'business.edit.route',
      path: '/guia/anuncios/:id/editar',
      componentId: 'business-directory:edit-page',
      requireAuth: true,
      requiredCapabilities: ['business.write']
    });

    const context: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: ['business.write'],
      permissions: [],
      versions: {
        registryVersion: 1,
        capabilityVersion: 1,
        licenseVersion: 1,
        permissionVersion: 1,
        policyVersion: 1,
        layoutVersion: 1
      }
    };

    const resolved = resolver.resolveRoute(context, '/guia/anuncios/b8392-a129/editar');

    expect(resolved).toBeDefined();
    expect(resolved?.route.id).toBe('business.edit.route');
    expect(resolved?.params.id).toBe('b8392-a129');
    expect(resolved?.rewriteUrl).toBe('/plugins/business-directory/pages/edit-page?id=b8392-a129');
  });

  it('rejects route resolution if capabilities are missing', () => {
    routeRegistry.register({
      id: 'business.edit.route',
      path: '/guia/anuncios/:id/editar',
      componentId: 'business-directory:edit-page',
      requireAuth: true,
      requiredCapabilities: ['business.write'] // Requires business.write
    });

    const contextWithoutCapability: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: ['other.capability'], // Missing business.write
      permissions: [],
      versions: {
        registryVersion: 1,
        capabilityVersion: 1,
        licenseVersion: 1,
        permissionVersion: 1,
        policyVersion: 1,
        layoutVersion: 1
      }
    };

    const resolved = resolver.resolveRoute(contextWithoutCapability, '/guia/anuncios/123/editar');
    expect(resolved).toBeNull(); // Should be rejected safely
  });

  it('correctly builds presentation snapshot with filtered navigation based on capabilities', () => {
    routeRegistry.register({
      id: 'business.dashboard.route',
      path: '/guia/painel',
      componentId: 'business-directory:dashboard-page',
      requireAuth: true,
      requiredCapabilities: ['business.manage']
    });

    navigationRegistry.register({
      id: 'business.dashboard.nav',
      label: 'Gerenciar Empresas',
      route: '/guia/painel', // Matches the static route
      order: 100,
      capability: 'business.manage'
    });

    const contextWithManage: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: ['business.manage'],
      permissions: [],
      versions: {
        registryVersion: 1, capabilityVersion: 1, licenseVersion: 1,
        permissionVersion: 1, policyVersion: 1, layoutVersion: 1
      }
    };

    const contextWithoutManage: PresentationContext = {
      tenantId: 'tenant-1',
      locale: 'pt-BR',
      capabilities: [],
      permissions: [],
      versions: {
        registryVersion: 1, capabilityVersion: 1, licenseVersion: 1,
        permissionVersion: 1, policyVersion: 1, layoutVersion: 1
      }
    };

    const snapshotAllowed = resolver.resolve(contextWithManage);
    expect(snapshotAllowed.routes.length).toBe(1);
    expect(snapshotAllowed.navigation.length).toBe(1);
    expect(snapshotAllowed.navigation[0].id).toBe('business.dashboard.nav');

    const snapshotForbidden = resolver.resolve(contextWithoutManage);
    expect(snapshotForbidden.routes.length).toBe(0);
    expect(snapshotForbidden.navigation.length).toBe(0); // Navigation hidden because route is hidden
  });
});
