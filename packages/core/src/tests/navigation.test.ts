import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationRegistry } from '../navigation/navigation-registry';
import { RouteRegistry } from '../presentation/presentation-registries';
import { NavigationResolver } from '../navigation/navigation-resolver';
import type { PresentationContext } from '../presentation/presentation-types';
import type { RouteDefinition } from '../presentation/presentation-types';

describe('NavigationResolver', () => {
  let navigationRegistry: NavigationRegistry;
  let routeRegistry: RouteRegistry;
  let resolver: NavigationResolver;

  const baseContext: PresentationContext = {
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

  const baseRoutes: RouteDefinition[] = [
    { id: 'r1', path: '/dashboard', requireAuth: true },
    { id: 'r2', path: '/admin', requireAuth: true, requiredCapabilities: ['admin'] },
    { id: 'r3', path: '/guia', requireAuth: false },
    { id: 'r4', path: '/plugin/example-dashboard', requireAuth: true, requiredPermissions: ['example.dashboard.view'] },
    { id: 'r5', path: '/admin/organizacoes', requireAuth: true, requiredPermissions: ['organization:manage'] },
  ];

  beforeEach(() => {
    navigationRegistry = new NavigationRegistry();
    routeRegistry = new RouteRegistry();
    resolver = new NavigationResolver(navigationRegistry, routeRegistry);

    baseRoutes.forEach(r => routeRegistry.register(r));
  });

  describe('Filtro por Capability', () => {
    it('deve mostrar item quando usuário tem a capability necessária', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Dashboard',
        route: '/dashboard',
        order: 1,
      } as any);

      const context = { ...baseContext, capabilities: ['business.manage'] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('nav1');
    });

    it('deve ocultar item quando usuário NÃO tem a capability necessária', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        capability: 'admin',
      } as any);

      const context = { ...baseContext, capabilities: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });
  });

  describe('Filtro por Permissão', () => {
    it('deve mostrar item quando usuário tem a permissão necessária', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Painel Exemplo',
        route: '/plugin/example-dashboard',
        order: 1,
        permission: 'example.dashboard.view',
      } as any);

      const context = { ...baseContext, permissions: ['example.dashboard.view'] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('nav1');
    });

    it('deve ocultar item quando usuário NÃO tem a permissão necessária', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Painel Exemplo',
        route: '/plugin/example-dashboard',
        order: 1,
        permission: 'example.dashboard.view',
      } as any);

      const context = { ...baseContext, permissions: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });
  });

  describe('Filtro por Role', () => {
    it('deve mostrar item quando usuário tem o role necessário', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        role: 'admin',
      } as any);

      const context = { ...baseContext, capabilities: ['admin'], permissions: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
    });

    it('deve ocultar item quando usuário NÃO tem o role necessário', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        role: 'admin',
      } as any);

      const context = { ...baseContext, capabilities: [], permissions: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });
  });

  describe('Filtro por Policy', () => {
    it('deve mostrar item quando policyDecision retorna true', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        policy: 'canManageUsers',
      } as any);

      const context = {
        ...baseContext,
        policyDecision: { canManageUsers: true },
      };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
    });

    it('deve ocultar item quando policyDecision retorna false', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        policy: 'canManageUsers',
      } as any);

      const context = {
        ...baseContext,
        policyDecision: { canManageUsers: false },
      };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });

    it('deve ocultar item quando policyDecision não existe', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
        policy: 'canManageUsers',
      } as any);

      const context = { ...baseContext };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });
  });

  describe('Filtro por Rota Resolvida', () => {
    it('deve ocultar item de navegação se a rota correspondente foi filtrada', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Admin',
        route: '/admin',
        order: 1,
      } as any);

      // Simula rotas já filtradas pelo RouteResolver (sem /admin pois user não tem capability 'admin')
      const resolvedRoutes = baseRoutes.filter(r => r.path !== '/admin');

      const context = { ...baseContext, capabilities: [] };
      const result = resolver.resolveAll(context, resolvedRoutes);

      expect(result.length).toBe(0);
    });

    it('deve mostrar item de navegação se a rota correspondente está disponível', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Dashboard',
        route: '/dashboard',
        order: 1,
      } as any);

      const context = { ...baseContext, capabilities: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
    });

    it('não deve filtrar links externos (http)', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'External',
        route: 'https://example.com',
        order: 1,
      } as any);

      const context = { ...baseContext, capabilities: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
    });
  });

  describe('Filtro Recursivo em Children', () => {
    it('deve filtrar children recursivamente', () => {
      navigationRegistry.register({
        id: 'parent',
        label: 'Parent',
        route: '/dashboard',
        order: 1,
        children: [
          {
            id: 'child1',
            label: 'Child Admin',
            route: '/admin',
            order: 1,
            permission: 'admin:access',
          },
          {
            id: 'child2',
            label: 'Child Public',
            route: '/guia',
            order: 2,
          },
        ],
      } as any);

      const context = { ...baseContext, permissions: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('parent');
      expect(result[0]?.children?.length).toBe(1);
      expect(result[0]?.children?.[0]?.id).toBe('child2');
    });

    it('deve remover parent se todos os children foram filtrados e parent não tem rota própria', () => {
      navigationRegistry.register({
        id: 'parent',
        label: 'Parent',
        route: '/admin',
        order: 1,
        permission: 'admin:access',
        children: [
          {
            id: 'child1',
            label: 'Child Admin',
            route: '/admin/organizacoes',
            order: 1,
            permission: 'organization:manage',
          },
        ],
      } as any);

      const context = { ...baseContext, permissions: [] };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(0);
    });
  });

  describe('Ordenação Determinística', () => {
    it('deve ordenar por order ASC, depois label ASC', () => {
      navigationRegistry.register({ id: 'a', label: 'Zeta', route: '/guia', order: 2 } as any);
      navigationRegistry.register({ id: 'b', label: 'Alpha', route: '/guia', order: 1 } as any);
      navigationRegistry.register({ id: 'c', label: 'Beta', route: '/guia', order: 1 } as any);

      const context = { ...baseContext };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result[0]?.id).toBe('b'); // order 1, label Alpha
      expect(result[1]?.id).toBe('c'); // order 1, label Beta
      expect(result[2]?.id).toBe('a'); // order 2
    });

    it('itens sem order devem ir para o final', () => {
      navigationRegistry.register({ id: 'a', label: 'A', route: '/guia' } as any);
      navigationRegistry.register({ id: 'b', label: 'B', route: '/guia', order: 1 } as any);

      const context = { ...baseContext };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result[0]?.id).toBe('b');
      expect(result[1]?.id).toBe('a');
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('deve isolar navegação por tenantId', () => {
      navigationRegistry.register({
        id: 'nav1',
        label: 'Tenant A',
        route: '/dashboard',
        order: 1,
      } as any);

      const contextA = { ...baseContext, tenantId: 'tenant-a' };
      const contextB = { ...baseContext, tenantId: 'tenant-b' };

      const resultA = resolver.resolveAll(contextA, baseRoutes);
      const resultB = resolver.resolveAll(contextB, baseRoutes);

      expect(resultA.length).toBe(1);
      expect(resultB.length).toBe(1);
    });
  });

  describe('Contexto com Múltiplas Permissões/Capabilities', () => {
    it('deve mostrar todos os itens permitidos quando usuário tem múltiplas permissões', () => {
      navigationRegistry.register({ id: 'n1', label: 'Dashboard', route: '/dashboard', order: 1 } as any);
      navigationRegistry.register({ id: 'n2', label: 'Painel Exemplo', route: '/plugin/example-dashboard', order: 2, permission: 'example.dashboard.view' } as any);
      navigationRegistry.register({ id: 'n3', label: 'Organizações', route: '/admin/organizacoes', order: 3, permission: 'organization:manage' } as any);

      const context = {
        ...baseContext,
        permissions: ['example.dashboard.view', 'organization:manage'],
      };
      const result = resolver.resolveAll(context, baseRoutes);

      expect(result.length).toBe(3);
    });
  });
});