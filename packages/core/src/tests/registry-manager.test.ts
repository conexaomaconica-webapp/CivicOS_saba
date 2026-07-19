// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { RegistryManager } from '../registry-manager';
import { CapabilityGraph } from '../capabilities/capability-graph';
import type { FullLoadedManifest } from '../manifest-loader';

describe('Registry Manager', () => {
  it('should populate all registries from a valid manifest', () => {
    const rm = new RegistryManager();
    
    const manifest: FullLoadedManifest = {
      plugin: { id: 'test-plugin', name: 'Test', version: '1.0.0' },
      capabilities: { provides: ['test:cap'], requires: [] },
      routes: [{ path: '/test', page: 'pages/test', public: true }],
      widgets: [{ id: 'w1', slot: 's1', component: 'c1', order: 1 }],
      navigation: [{ id: 'n1', path: '/test', label: 'Test Nav', order: 10 }],
      permissions: [{ key: 'p1', label: 'Permission 1' }],
      settings: [{ key: 'set1', label: 'Setting 1', type: 'string', default: 'val' }]
    };

    rm.populateFromManifests([manifest]);

    // Routes
    expect(rm.presentationRoutes.getAll()).toHaveLength(1);
    expect(rm.presentationRoutes.get('/test')).toMatchObject({ id: 'test-plugin:/test' });
    
    // Capabilities
    expect(rm.capabilities.hasCapability('test:cap')).toBe(true);
    expect(rm.capabilities.getDefinition('test:cap')?.provider).toBe('test-plugin');
    const snapshot = rm.capabilities.snapshot();
    const report = CapabilityGraph.analyze(snapshot);
    expect(report.errors).toHaveLength(0); // No errors

    // Widgets
    const widgets = rm.presentationWidgets.getAll().filter(w => w.slot === 's1');
    expect(widgets).toHaveLength(1);
    expect(widgets[0].componentId).toBe('c1');

    // Navigation
    const navs = rm.presentationNavigation.getAll();
    expect(navs).toHaveLength(1);
    expect(navs[0].label).toBe('Test Nav');

    // Permissions
    expect(rm.permissions.getAll()).toHaveLength(1);
    
    // Settings
    expect(rm.settings.getAll()).toHaveLength(1);
  });

  it('should validate missing capabilities', () => {
    const rm = new RegistryManager();
    rm.populateFromManifests([{
      plugin: { id: 'req-plugin', name: 'Req', version: '1.0.0' },
      capabilities: { requires: ['missing:cap'] }
    }]);

    const snapshot = rm.capabilities.snapshot();
    const report = CapabilityGraph.analyze(snapshot);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatch(/missing:cap/);
  });
  
  it('should sort widgets by priority when requested manually', () => {
    const rm = new RegistryManager();
    rm.populateFromManifests([{
      plugin: { id: 'w-plugin', name: 'W', version: '1.0.0' },
      widgets: [
        { id: 'w-last', slot: 's1', component: 'c', order: 100 },
        { id: 'w-first', slot: 's1', component: 'c', order: 1 },
        { id: 'w-mid', slot: 's1', component: 'c', order: 50 },
      ]
    }]);

    const widgets = rm.presentationWidgets.getAll().sort((a, b) => a.priority - b.priority);
    expect(widgets.map(w => w.id)).toEqual(['w-plugin:w-first', 'w-plugin:w-mid', 'w-plugin:w-last']);
  });
});
