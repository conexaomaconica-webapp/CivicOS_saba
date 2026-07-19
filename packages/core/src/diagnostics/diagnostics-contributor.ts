// ============================================================================
// Diagnostics Contributor — Diagnostics Platform (AC-6D)
// ============================================================================

import type { DiagnosticsSection } from './diagnostics-types';

export interface DiagnosticsContributor {
  readonly id: string;
  collect(): Promise<DiagnosticsSection> | DiagnosticsSection;
}

export class DiagnosticsContributorRegistry {
  private readonly contributors = new Map<string, DiagnosticsContributor>();

  register(contributor: DiagnosticsContributor): void {
    if (this.contributors.has(contributor.id)) {
      throw new Error(`DiagnosticsContributor "${contributor.id}" is already registered.`);
    }
    this.contributors.set(contributor.id, contributor);
  }

  getContributors(): DiagnosticsContributor[] {
    return Array.from(this.contributors.values());
  }
}
