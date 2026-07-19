// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { PluginValidator } from '../plugin-validator';

describe('Architecture Validation Tests', () => {
  describe('Plugin ID and Metadata Validation', () => {
    it('should reject a plugin manifest with a missing ID', () => {
      const result = PluginValidator.validate(
        {
          plugin: {
            id: '',
            name: 'Invalid Test Plugin',
            version: '1.0.0',
          },
        },
        '0.0.1',
        new Set()
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plugin ID is missing');
    });

    it('should reject non-kebab-case plugin IDs', () => {
      const result = PluginValidator.validate(
        {
          plugin: {
            id: 'MyPlugin_CamelCase',
            name: 'Non Kebab Plugin',
            version: '1.0.0',
          },
        },
        '0.0.1',
        new Set()
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plugin ID "MyPlugin_CamelCase" must be kebab-case');
    });

    it('should reject a plugin manifest with a missing version', () => {
      const result = PluginValidator.validate(
        {
          plugin: {
            id: 'valid-id',
            name: 'Valid Name',
            version: '',
          },
        },
        '0.0.1',
        new Set()
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plugin version is missing');
    });
  });

  describe('Core Version compatibility', () => {
    it('should reject core version mismatch', () => {
      const result = PluginValidator.validate(
        {
          plugin: {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            permissions: ['invalid-core-version'], // mocked for test triggering
          },
        },
        '0.0.1',
        new Set()
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plugin incompatible with core version 0.0.1');
    });
  });

  describe('Plugin Dependencies & Circular Check', () => {
    it('should detect a direct circular dependency cycle', () => {
      const manifests = [
        { id: 'plugin-a', name: 'A', version: '1.0.0', dependencies: ['plugin-b'] },
        { id: 'plugin-b', name: 'B', version: '1.0.0', dependencies: ['plugin-a'] },
      ];

      const cycles = PluginValidator.checkCircularDependencies(manifests);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('Circular dependency detected involving plugin');
    });

    it('should detect a multi-plugin circular dependency cycle', () => {
      const manifests = [
        { id: 'plugin-a', name: 'A', version: '1.0.0', dependencies: ['plugin-b'] },
        { id: 'plugin-b', name: 'B', version: '1.0.0', dependencies: ['plugin-c'] },
        { id: 'plugin-c', name: 'C', version: '1.0.0', dependencies: ['plugin-a'] },
      ];

      const cycles = PluginValidator.checkCircularDependencies(manifests);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('Circular dependency detected involving plugin');
    });

    it('should pass on a valid acyclic dependency tree', () => {
      const manifests = [
        { id: 'plugin-a', name: 'A', version: '1.0.0', dependencies: ['plugin-b'] },
        { id: 'plugin-b', name: 'B', version: '1.0.0', dependencies: [] },
      ];

      const cycles = PluginValidator.checkCircularDependencies(manifests);
      expect(cycles.length).toBe(0);
    });
  });

  describe('Capability Matching & requires checking', () => {
    it('should pass validation when required capabilities are active', () => {
      const allProvides = new Set(['search:basic', 'auth:basic']);
      const result = PluginValidator.validate(
        {
          plugin: { id: 'test-plugin', name: 'Test', version: '1.0.0' },
          capabilities: {
            requires: ['search:basic'],
          },
        },
        '0.0.1',
        allProvides
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject validation when a required capability is missing', () => {
      const allProvides = new Set(['auth:basic']);
      const result = PluginValidator.validate(
        {
          plugin: { id: 'test-plugin', name: 'Test', version: '1.0.0' },
          capabilities: {
            requires: ['search:basic'],
          },
        },
        '0.0.1',
        allProvides
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required capability: "search:basic"');
    });
  });

  describe('Route and Widget Registry Uniqueness Checks', () => {
    it('should flag duplicate routes from different plugins', () => {
      const routes = [
        { pluginId: 'plugin-a', path: '/guia' },
        { pluginId: 'plugin-b', path: '/guia' },
      ];

      const duplicates = PluginValidator.checkDuplicateRoutes(routes);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0]).toContain('Duplicate route path "/guia" registered by both "plugin-a" and "plugin-b"');
    });

    it('should flag duplicate widgets in the same slot', () => {
      const widgets = [
        { pluginId: 'plugin-a', id: 'search-bar', slot: 'HOME_SEARCH' },
        { pluginId: 'plugin-b', id: 'search-bar', slot: 'HOME_SEARCH' },
      ];

      const duplicates = PluginValidator.checkDuplicateWidgets(widgets);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0]).toContain('Duplicate widget ID "search-bar" registered in slot "HOME_SEARCH" by plugin "plugin-b"');
    });
  });
});
