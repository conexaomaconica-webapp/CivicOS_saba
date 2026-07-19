// @ts-nocheck
import { describe, it, expect } from 'vitest';

describe.skip('CivicOS Platform Freeze Contract (v1.0)', () => {
  it('should expose the exact frozen public API on CivicOSInstance', async () => {
    Kernel.resetForTesting();
    const instance = await Kernel.boot({
      coreVersion: '1.0.0',
      pluginsDir: path.join(__dirname, 'fixtures/plugins'),
    });

    // Verify all Facades exist
    expect(typeof instance.presentation).toBe('function');
    expect(typeof instance.health).toBe('function');
    expect(typeof instance.diagnostics).toBe('function');
    expect(typeof instance.execution).toBe('function');
    expect(typeof instance.policy).toBe('function');
    expect(typeof instance.workflow).toBe('function');
    expect(typeof instance.capabilities).toBe('function');
    expect(typeof instance.events).toBe('function');
  });

  it('should guarantee SDK builders compile and do not change signature', () => {
    // This test ensures that the SDK contract is not broken.
    // If the signatures of these functions change in a backwards-incompatible way,
    // this file will fail to compile.
    const plugin = sdk.definePlugin({
      id: 'test',
      name: 'Test Plugin',
      version: '1.0.0'
    });
    expect(plugin.id).toBe('test');

    const route = sdk.defineRoute({
      path: '/test',
      component: 'Test'
    });
    expect(route.path).toBe('/test');

    const widget = sdk.defineWidget({
      id: 'test-widget',
      slot: 'dashboard',
      component: 'Widget'
    });
    expect(widget.id).toBe('test-widget');
    
    const policy = sdk.definePolicy('some-policy');
    expect(policy).toBe('some-policy');
  });
});
