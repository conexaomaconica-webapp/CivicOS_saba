// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { Kernel } from '../kernel';
import { EventBus } from '../event-bus';
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

describe('EventBus Runtime Sequence', () => {
  beforeEach(() => {
    Kernel.resetForTesting();
  });

  const manifest = {
    'plugins/plugin-test/manifest/plugin.json': {
      id: 'plugin-test',
      name: 'Test',
      version: '1.0.0',
    },
  };

  it('should emit the strict sequence of boot events', async () => {
    const reader = createInMemoryReader(manifest);
    const eventBus = new EventBus();
    const emittedEvents: string[] = [];
    
    // Subscribe to all events using the wildcard
    eventBus.on('*', (payload: unknown) => {
      // The event-bus might not pass the event name as the first arg in a wildcard,
      // wait, let's look at how EventBus handles wildcards...
      // Alternatively, we can just bind to the specific events we expect.
    });

    const expectedEvents = [
      'kernel.boot.started',
      'plugin.discovered',
      'plugin.validated',
      'plugin.lifecycle.changed', // discovered -> active triggers multiple changes, but let's just track names
      'registry.updated',
      'registry.frozen',
      'kernel.boot.completed'
    ];

    for (const evt of expectedEvents) {
      eventBus.on(evt, () => emittedEvents.push(evt));
    }

    await Kernel.boot({
      pluginsDir: 'plugins',
      reader,
      coreVersion: '0.0.1',
      eventBus,
    });
    
    // Lifecycle changed happens twice for a single plugin (discovered -> installed -> ... -> active)
    // We filter down to unique sequence or just assert the relative order.
    // Let's filter to unique contiguous events to verify the high-level phases.
    const sequence = emittedEvents.filter((v, i, a) => v !== a[i - 1]);

    expect(sequence).toEqual([
      'kernel.boot.started',
      'plugin.discovered',
      'plugin.validated',
      'plugin.lifecycle.changed',
      'registry.updated',
      'registry.frozen',
      'kernel.boot.completed'
    ]);
  });
});
