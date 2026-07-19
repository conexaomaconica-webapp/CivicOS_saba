// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { ManifestLoader } from '../manifest-loader';
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

describe('Manifest Loader', () => {
  it('should load a complete valid manifest with all fields', async () => {
    const reader = createInMemoryReader({
      'plugins/valid/manifest/plugin.json': { id: 'valid', name: 'Valid', version: '1.0.0' },
      'plugins/valid/manifest/routes.json': [{ path: '/test', page: 'pages/test', public: true }],
      'plugins/valid/manifest/widgets.json': [{ id: 'w1', slot: 's1', component: 'c1', order: 1 }],
    });
    const loader = new ManifestLoader(reader);

    const manifests = await loader.discoverAndLoad('plugins');
    expect(manifests).toHaveLength(1);
    expect(manifests[0].plugin.id).toBe('valid');
    
    // Ensure full route objects are preserved
    expect(manifests[0].routes![0]).toMatchObject({ path: '/test', page: 'pages/test', public: true });
    // Ensure full widget objects are preserved
    expect(manifests[0].widgets![0]).toMatchObject({ id: 'w1', slot: 's1', component: 'c1', order: 1 });
  });

  it('should gracefully handle missing split files', async () => {
    const reader = createInMemoryReader({
      'plugins/minimal/manifest/plugin.json': { id: 'minimal', name: 'Min', version: '1.0.0' },
      // No routes, no widgets, etc.
    });
    const loader = new ManifestLoader(reader);

    const manifests = await loader.discoverAndLoad('plugins');
    expect(manifests).toHaveLength(1);
    expect(manifests[0].plugin.id).toBe('minimal');
    expect(manifests[0].routes).toBeUndefined();
    expect(manifests[0].widgets).toBeUndefined();
  });

  it('should ignore directories without a plugin.json', async () => {
    const reader = createInMemoryReader({
      'plugins/not-a-plugin/manifest/routes.json': [{ path: '/test' }],
      'plugins/not-a-plugin/package.json': { name: 'random' },
    });
    const loader = new ManifestLoader(reader);

    const manifests = await loader.discoverAndLoad('plugins');
    expect(manifests).toHaveLength(0);
  });

  it('should fallback to root plugin.json if manifest/plugin.json does not exist', async () => {
    const reader = createInMemoryReader({
      'plugins/legacy/plugin.json': { id: 'legacy', name: 'Legacy', version: '1.0.0' },
      'plugins/legacy/routes.json': [{ path: '/legacy' }],
    });
    const loader = new ManifestLoader(reader);

    const manifests = await loader.discoverAndLoad('plugins');
    expect(manifests).toHaveLength(1);
    expect(manifests[0].plugin.id).toBe('legacy');
    expect(manifests[0].routes![0].path).toBe('/legacy');
  });
});
