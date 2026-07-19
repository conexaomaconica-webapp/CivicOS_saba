// ============================================================================
// Capability Graph — Capability Platform
// ============================================================================
// Performs topological analysis of the CapabilityRegistryState snapshot.
// Detects cycles, missing dependencies, orphaned capabilities, and duplicates.
//
// Outputs a CapabilityValidationReport used for Architecture Health.
// ============================================================================

import type { CapabilityRegistryState } from './capability-registry';

export interface CapabilityValidationReport {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly suggestions: string[];
}

export class CapabilityGraph {
  /**
   * Analyzes the Capability Registry State and returns a detailed validation report.
   */
  static analyze(state: CapabilityRegistryState): CapabilityValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const providedMap = state.provided;
    const requiredMap = state.required;

    // 1. Detect Duplicates & Consolidate Graph Nodes
    const nodes = new Set<string>();
    const requiredNodes = new Set<string>();

    for (const [capId, providers] of providedMap.entries()) {
      nodes.add(capId);
      if (providers.length > 1) {
        errors.push(`Capability "${capId}" is duplicated. Provided by: ${providers.map(p => p.provider).join(', ')}`);
      }
    }

    // 2. Validate Plugin Requirements (Missing Capabilities)
    for (const [pluginId, reqs] of requiredMap.entries()) {
      for (const req of reqs) {
        requiredNodes.add(req);
        if (!providedMap.has(req)) {
          errors.push(`Plugin "${pluginId}" requires capability "${req}", but it is not provided by any plugin.`);
        }
      }
    }

    // 3. Capability-level requirements (Cycles & Missing)
    // Capabilities themselves can require other capabilities (via definition.requires).
    const adjacencyList = new Map<string, string[]>();

    for (const [capId, providers] of providedMap.entries()) {
      const def = providers[0];
      if (def && def.requires && def.requires.length > 0) {
        adjacencyList.set(capId, [...def.requires]);

        for (const req of def.requires) {
          requiredNodes.add(req);
          if (!providedMap.has(req)) {
            errors.push(`Capability "${capId}" requires capability "${req}", but it is not provided by any plugin.`);
          }
        }
      } else {
        adjacencyList.set(capId, []);
      }
    }

    // 4. Detect Cycles (DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (node: string): boolean => {
      if (recursionStack.has(node)) {
        errors.push(`Circular dependency detected involving capability "${node}".`);
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacencyList.get(node) || [];
      let hasCycle = false;
      for (const neighbor of neighbors) {
        if (detectCycle(neighbor)) {
          hasCycle = true;
        }
      }

      recursionStack.delete(node);
      return hasCycle;
    };

    for (const capId of nodes) {
      if (!visited.has(capId)) {
        detectCycle(capId);
      }
    }

    // 5. Detect Orphaned Capabilities (Provided but nobody requires them)
    // Exception: Capabilities that are the core offering of a plugin might not be "required" by other plugins,
    // they are consumed by the frontend via FeatureEngine. But it's good as a suggestion/warning.
    for (const capId of nodes) {
      if (!requiredNodes.has(capId)) {
        // Just a suggestion, not a warning, because a cap might be purely for UI usage.
        suggestions.push(`Capability "${capId}" is provided but no other plugin explicitly requires it.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}
