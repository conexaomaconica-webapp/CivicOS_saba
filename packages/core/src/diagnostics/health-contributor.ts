// ============================================================================
// Health Contributor & Aggregator — Diagnostics Platform (AC-6D)
// ============================================================================

import { HealthStatus } from './diagnostics-types';

export interface HealthContributor {
  readonly id: string;
  check(): Promise<HealthStatus> | HealthStatus;
}

export class HealthContributorRegistry {
  private readonly contributors = new Map<string, HealthContributor>();

  register(contributor: HealthContributor): void {
    if (this.contributors.has(contributor.id)) {
      throw new Error(`HealthContributor "${contributor.id}" is already registered.`);
    }
    this.contributors.set(contributor.id, contributor);
  }

  getContributors(): HealthContributor[] {
    return Array.from(this.contributors.values());
  }
}

export class HealthAggregator {
  constructor(private readonly registry: HealthContributorRegistry) {}

  /**
   * Aggregates the health status of all contributors.
   * Priority (worst wins): DOWN > DEGRADED > UP.
   * UNKNOWN is ignored unless it's the only status.
   */
  async aggregate(): Promise<HealthStatus> {
    const contributors = this.registry.getContributors();
    if (contributors.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    let finalStatus = HealthStatus.UP;
    let hasUnknown = false;

    for (const contributor of contributors) {
      try {
        const status = await contributor.check();
        
        if (status === HealthStatus.DOWN) {
          return HealthStatus.DOWN; // Short-circuit, nothing is worse than DOWN
        } else if (status === HealthStatus.DEGRADED) {
          finalStatus = HealthStatus.DEGRADED;
        } else if (status === HealthStatus.UNKNOWN) {
          hasUnknown = true;
        }
      } catch (error) {
        // If a contributor throws, we assume it's degraded, not down. 
        // A single component failing its check shouldn't crash the Kernel's health completely unless it explicitly reports DOWN.
        finalStatus = HealthStatus.DEGRADED;
      }
    }

    // If everything was UNKNOWN (no UP/DEGRADED), return UNKNOWN
    if (hasUnknown && finalStatus === HealthStatus.UP && contributors.length === 1) {
       return HealthStatus.UNKNOWN;
    }

    return finalStatus;
  }
}
