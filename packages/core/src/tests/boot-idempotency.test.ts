// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { Kernel, KernelBootOptions } from '../kernel';
import { CORE_TOKENS } from '../di/tokens';
import type { ManifestReader } from '../manifest-loader';

function createInMemoryReader(files: Record<string, unknown>): ManifestReader {
  return {
    async exists(path: string): Promise<boolean> {
      return Object.keys(files).some((k) => k === path || k.startsWith(path + '/'));
    },
    async readJson<T>(path: string): Promise<T | null> {
      const data = files[path];
      return data !== undefined ? (data as T) : null;
    },
    async listDirectories(path: string): Promise<string[]> {
      const prefix = path.endsWith('/') ? path : path + '/';
      const dirs = new Set<string>();
      for (const key of Object.keys(files)) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstSlash = rest.indexOf('/');
          if (firstSlash > 0) {
            dirs.add(rest.slice(0, firstSlash));
          }
        }
      }
      return Array.from(dirs);
    },
  };
}

describe('Kernel Boot Idempotency', () => {
  beforeEach(() => {
    Kernel.resetForTesting();
  });

  const manifest = {
    'plugins/plugin-a/manifest/plugin.json': {
      id: 'plugin-a',
      name: 'A',
      version: '1.0.0',
    },
    'plugins/plugin-a/manifest/routes.json': [
      { path: '/a', page: 'pages/a' }
    ]
  };

  it('should return the exact same cached result on a second boot', async () => {
    const reader = createInMemoryReader(manifest);
    
    // First boot succeeds
    const result1 = await Kernel.boot({
      pluginsDir: 'plugins',
      reader,
      coreVersion: '0.0.1',
    });
    
    expect(result1._internal.activePlugins).toContain('plugin-a');
    const rm1 = result1._internal.container.resolve(CORE_TOKENS.RegistryManager);
    expect(rm1.presentationRoutes.getAll()).toHaveLength(1);

    // Second boot should return the identical reference
    const result2 = await Kernel.boot({
      pluginsDir: 'plugins',
      reader,
      coreVersion: '0.0.1',
    });
    
    expect(result2).toBe(result1); // Exact strict equality
    
    // Total routes in first instance should still be 1, not duplicated
    const rm2 = result2._internal.container.resolve(CORE_TOKENS.RegistryManager);
    expect(rm2.presentationRoutes.getAll()).toHaveLength(1);
    
    // Attempting to modify frozen registries throws
    expect(() => {
      const rm = result1._internal.container.resolve(CORE_TOKENS.RegistryManager);
      rm.presentationRoutes.register({ id: 'a', path: '/b', requireAuth: true });
    }).toThrow('Registry is frozen');
  });
});
