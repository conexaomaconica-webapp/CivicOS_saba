// ============================================================================
// Capability Resolver — Capability Platform
// ============================================================================
// The pure function engine that evaluates if a tenant can use a capability.
// It relies strictly on the pre-computed ResolvedLicense and the static 
// CapabilityRegistry.
//
// INVARIANTS: 
// 1. Pure function. No DB calls, no I/O, no side effects.
// 2. Returns true if and only if the capability exists in the registry AND
//    is present in the tenant's resolved license.
// ============================================================================

import type { ResolvedLicense } from '../licensing/resolved-license';
import type { CapabilityRegistry } from './capability-registry';

export class CapabilityResolver {
  /**
   * Evaluates if a given license grants access to a specific capability.
   * 
   * @param license The resolved license for the tenant
   * @param registry The system capability registry
   * @param capabilityId The capability being requested
   * @returns boolean true if allowed, false otherwise
   */
  static canUse(
    license: ResolvedLicense,
    registry: CapabilityRegistry,
    capabilityId: string
  ): boolean {
    // 1. The capability must exist in the system (must be provided by a plugin)
    if (!registry.hasCapability(capabilityId)) {
      return false;
    }

    // 2. The tenant's license must explicitly grant it
    // (License was already built considering Plan + Addons + Overrides)
    if (!license.capabilities.has(capabilityId)) {
      return false;
    }

    // Note: Dependency resolution (e.g., A requires B) is inherently handled
    // by the Licensing Engine during the ResolvedLicense generation.
    // If the Licensing Engine gave them A, but they lack B, the Licensing Engine
    // itself is faulty or the CapabilityRegistry's required array was violated.
    // However, as an extra safety measure, we could strictly check dependencies here,
    // but the Constitution says: "A única responsabilidade é resolver capacidades a 
    // partir de um ResolvedLicense".

    return true;
  }
}
