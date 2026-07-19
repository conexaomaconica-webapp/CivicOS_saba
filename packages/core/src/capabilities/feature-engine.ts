// ============================================================================
// Feature Engine — Capability Platform
// ============================================================================
// Translates backend capabilities into frontend feature flags.
// Acts as a context-bound evaluator so UI and business logic do not need 
// to pass the ResolvedLicense and CapabilityRegistry constantly.
//
// In CivicOS, every Feature Flag is derived 1:1 from a Capability.
// ============================================================================

import { CapabilityResolver } from './capability-resolver';
import type { CapabilityRegistry } from './capability-registry';
import type { ResolvedLicense } from '../licensing/resolved-license';

export class FeatureEngine {
  constructor(
    private readonly license: ResolvedLicense,
    private readonly registry: CapabilityRegistry
  ) {}

  /**
   * Checks if a specific feature is enabled for the current tenant context.
   */
  isEnabled(featureId: string): boolean {
    return CapabilityResolver.canUse(this.license, this.registry, featureId);
  }

  /**
   * Returns a map of all capabilities provided by the system,
   * indicating which ones are enabled for the current tenant.
   * Useful for bootstrapping the frontend state.
   */
  exportFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    for (const capId of this.registry.getAllProvided().keys()) {
      flags[capId] = this.isEnabled(capId);
    }
    return flags;
  }
}
