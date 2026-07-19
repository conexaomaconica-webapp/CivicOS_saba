// ============================================================================
// Plugin Graph — Plugin Runtime
// ============================================================================
// Performs topological sorting of plugins based on their dependencies.
// Resolves the exact boot order and detects circular dependencies among plugins.
// ============================================================================

import type { PluginManifest } from '../plugin-registry';

export interface PluginGraphResult {
  readonly sortedIds: string[];
  readonly cycles: string[];
  readonly missingDependencies: string[];
}

export class PluginGraph {
  /**
   * Performs a topological sort of the given plugin manifests based on
   * their `dependencies`. Returns the correct boot order.
   */
  static resolveBootOrder(manifests: PluginManifest[]): PluginGraphResult {
    const sortedIds: string[] = [];
    const cycles: string[] = [];
    const missingDependencies: string[] = [];

    const map = new Map<string, PluginManifest>();
    for (const m of manifests) {
      map.set(m.id, m);
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string, parent?: string): void => {
      if (visited.has(id)) {
        return;
      }
      
      if (visiting.has(id)) {
        cycles.push(`Circular dependency detected involving plugin "${id}"`);
        return;
      }

      visiting.add(id);

      const manifest = map.get(id);
      if (!manifest) {
        if (parent) {
          missingDependencies.push(`Plugin "${parent}" requires "${id}", which is not installed.`);
        }
        visiting.delete(id);
        visited.add(id); // Avoid redundant warnings
        return;
      }

      const deps = manifest.dependencies ?? [];
      for (const dep of deps) {
        visit(dep, id);
      }

      visiting.delete(id);
      visited.add(id);
      sortedIds.push(id);
    };

    for (const manifest of manifests) {
      if (!visited.has(manifest.id)) {
        visit(manifest.id);
      }
    }

    return {
      sortedIds,
      cycles,
      missingDependencies,
    };
  }
}
