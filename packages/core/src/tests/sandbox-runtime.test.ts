// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { PluginContextFactory } from '../plugins/plugin-context';
import { PermissionEngine } from '../permissions/permission-engine';
import { ServiceResolver } from '../services/service-resolver';
import { PluginEventBus } from '../plugins/plugin-event-bus';
import { EventBus } from '../event-bus';
import { Container } from '../di/container';
import type { PluginManifest } from '../plugin-registry';

describe('Plugin Runtime Sandbox (AC-5)', () => {
  it('should restrict plugin from emitting core events', () => {
    const globalBus = new EventBus();
    const pluginBus = new PluginEventBus(globalBus);

    // Allowed
    expect(() => pluginBus.emit('plugin.business_directory.booted', {})).not.toThrow();

    // Restricted
    expect(() => pluginBus.emit('kernel.boot.started' as any, {})).toThrowError(/Security Violation/);
    expect(() => pluginBus.emit('registry.updated' as any, {})).toThrowError(/Security Violation/);
  });

  it('should restrict plugin from resolving unauthorized services', () => {
    const manifest: PluginManifest = {
      id: 'business-directory',
      name: 'BD',
      version: '1.0.0',
      runtime: {
        services: ['StorageService']
      }
    };

    const container = new Container();
    
    // Mock the core implementation
    container.register({ symbol: Symbol('StorageService'), description: 'StorageService' }, { upload: vi.fn() });
    container.register({ symbol: Symbol('PaymentService'), description: 'PaymentService' }, { charge: vi.fn() });

    const permissionEngine = new PermissionEngine();
    permissionEngine.initialize([manifest]);

    const serviceResolver = new ServiceResolver('business-directory', container, permissionEngine);

    // Allowed Service
    const storage = serviceResolver.resolve<any>('StorageService');
    expect(storage.upload).toBeDefined();

    // Unauthorized Service
    expect(() => serviceResolver.resolve('PaymentService')).toThrowError(/Permission Denied/);
  });

  it('should enforce an immutable PluginContext', () => {
    const globalBus = new EventBus();
    const pluginBus = new PluginEventBus(globalBus);
    const container = new Container();
    const permissionEngine = new PermissionEngine();

    const capabilities: any = {};
    const services = new ServiceResolver('test', container, permissionEngine);

    const context = PluginContextFactory.create(
      'test',
      capabilities,
      services,
      pluginBus,
      permissionEngine
    );

    expect(Object.isFrozen(context)).toBe(true);

    // Attempting to overwrite a property on an immutable object throws in strict mode
    expect(() => {
      'use strict';
      // @ts-ignore - TS already prevents this, but we test runtime protection
      context.logger = console;
    }).toThrowError(/Cannot assign to read only property/);
  });
});
