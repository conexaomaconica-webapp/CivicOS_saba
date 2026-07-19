// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteRegistry, NavigationRegistry, WidgetRegistry, SlotRegistry, LayoutRegistry } from '../presentation/presentation-registries';
import { NavigationGraph, NavigationGraphError } from '../presentation/navigation-graph';
import { PresentationSnapshotBuilder } from '../presentation/query/presentation-snapshot-builder';
import { RouteResolver } from '../presentation/query/route-resolver';
import { NavigationResolver } from '../presentation/query/navigation-resolver';
import { LayoutResolver } from '../presentation/query/layout-resolver';
import { WidgetResolver } from '../presentation/query/widget-resolver';
import type { DiagnosticsEngine } from '../diagnostics/diagnostics-engine';
import { generateCacheKey } from '../presentation/query/presentation-cache';

describe('Presentation Runtime (AC-7B)', () => {
  
  describe('Presentation Registries', () => {
    it('should register and freeze registries successfully', () => {
      const routes = new RouteRegistry();
      routes.register({ id: 'route1', path: '/dashboard', requireAuth: true });
      
      expect(routes.getAll().length).toBe(1);
      
      routes.freeze();
      expect(() => routes.register({ id: 'route2', path: '/admin', requireAuth: true })).toThrow(/Registry is frozen/);
    });

    it('should reject structurally duplicate routes', () => {
      const routes = new RouteRegistry();
      routes.register({ id: 'r1', path: '/test', requireAuth: false });
      expect(() => routes.register({ id: 'r2', path: '/test', requireAuth: false })).toThrow(/is already registered/);
    });
  });

  describe('Navigation Graph', () => {
    let mockDiagnostics: DiagnosticsEngine;

    beforeEach(() => {
      mockDiagnostics = {
        recordEvent: vi.fn(),
      } as unknown as DiagnosticsEngine;
    });

    it('should abort boot (throw) when navigation menus have circular dependencies', () => {
      const routes = new RouteRegistry();
      const navs = new NavigationRegistry();
      
      routes.register({ id: 'r1', path: '/dashboard', requireAuth: false });
      
      navs.register({ id: 'n1', label: 'Item 1', path: '/dashboard', parentId: 'n2', priority: 1 });
      navs.register({ id: 'n2', label: 'Item 2', path: '/dashboard', parentId: 'n1', priority: 2 });

      const graph = new NavigationGraph(routes, navs, new WidgetRegistry(), new SlotRegistry(), new LayoutRegistry(), mockDiagnostics);
      
      expect(() => graph.validate()).toThrow(NavigationGraphError);
      expect(() => graph.validate()).toThrow(/Circular dependency/);
    });

    it('should drop orphan navigation items (referential error) without aborting boot', () => {
      const routes = new RouteRegistry();
      const navs = new NavigationRegistry();
      
      navs.register({ id: 'orphan', label: 'Orphan', path: '/does-not-exist', priority: 1 });
      navs.register({ id: 'valid', label: 'Valid', path: '/dashboard', priority: 2 });
      routes.register({ id: 'r1', path: '/dashboard', requireAuth: false });

      const graph = new NavigationGraph(routes, navs, new WidgetRegistry(), new SlotRegistry(), new LayoutRegistry(), mockDiagnostics);
      
      // Should not throw
      graph.validate();
      
      // Should have dropped 'orphan'
      expect(navs.getAll().length).toBe(1);
      expect(navs.getAll()[0].id).toBe('valid');
      
      // Should have reported to diagnostics
      expect(mockDiagnostics.recordEvent).toHaveBeenCalled();
    });
  });

  describe('Presentation Snapshot Builder', () => {
    it('should resolve, filter, and sort snapshot deterministically based on context', () => {
      const routes = new RouteRegistry();
      const navs = new NavigationRegistry();
      const widgets = new WidgetRegistry();
      
      routes.register({ id: 'r1', path: '/dashboard', requireAuth: true });
      routes.register({ id: 'r2', path: '/admin', requireAuth: true, requiredCapabilities: ['billing'] });
      routes.register({ id: 'r3', path: '/about', requireAuth: false });
      
      navs.register({ id: 'n1', label: 'Dashboard', path: '/dashboard', priority: 2 });
      navs.register({ id: 'n2', label: 'Admin', path: '/admin', priority: 1 });
      navs.register({ id: 'n3', label: 'About', path: '/about', priority: 1 });
      
      const builder = new PresentationSnapshotBuilder(
        new RouteResolver(routes),
        new NavigationResolver(navs),
        new LayoutResolver(new LayoutRegistry()),
        new WidgetResolver(widgets),
        new SlotRegistry(),
        '1.0.0'
      );
      
      const contextWithoutBilling = {
        tenantId: 'tenant-1',
        locale: 'pt-BR',
        capabilities: [],
        permissions: [],
        versions: { registryVersion: 1, capabilityVersion: 1, licenseVersion: 1, permissionVersion: 1, policyVersion: 1, layoutVersion: 1 }
      };

      const snapshot = builder.build(contextWithoutBilling);
      
      // Should hide admin route due to lack of 'billing' capability
      expect(snapshot.routes.length).toBe(2);
      expect(snapshot.routes[0].id).toBe('r3'); // path /about comes first ASC
      expect(snapshot.routes[1].id).toBe('r1'); // path /dashboard
      
      // Should hide 'Admin' nav item because its route is hidden
      expect(snapshot.navigation.length).toBe(2);
      expect(snapshot.navigation[0].id).toBe('n3'); // priority 1 comes first
      expect(snapshot.navigation[1].id).toBe('n1'); // priority 2 comes second
      
      // Snapshot must be deeply immutable
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.routes)).toBe(true);
    });
  });

  describe('Presentation Cache', () => {
    it('should generate same key for identical contexts and different keys for altered versions', () => {
      const context1 = {
        tenantId: 'tenant-1',
        locale: 'pt-BR',
        capabilities: ['a', 'b'],
        permissions: [],
        versions: { registryVersion: 1, capabilityVersion: 1, licenseVersion: 1, permissionVersion: 1, policyVersion: 1, layoutVersion: 1 }
      };

      const context2 = {
        tenantId: 'tenant-1',
        locale: 'pt-BR',
        capabilities: ['b', 'a'], // Different order, but same logically
        permissions: [],
        versions: { registryVersion: 1, capabilityVersion: 1, licenseVersion: 1, permissionVersion: 1, policyVersion: 1, layoutVersion: 1 }
      };

      const context3 = {
        ...context1,
        versions: { ...context1.versions, registryVersion: 2 }
      };

      const key1 = generateCacheKey(context1);
      const key2 = generateCacheKey(context2);
      const key3 = generateCacheKey(context3);

      expect(key1).toBe(key2); // Consistent hashing handles order
      expect(key1).not.toBe(key3); // Version change invalidates hash
    });
  });
});
