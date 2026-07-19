// ============================================================================
// Diagnostics Engine — Diagnostics Platform (AC-6D)
// ============================================================================

import {
  SEVERITY_WEIGHTS,
  type DiagnosticsSection,
  type DiagnosticsSnapshot,
  type TimelineEvent,
  type UnifiedDiagnosticsReport,
  IssueSeverity
} from './diagnostics-types';
import type { DiagnosticsContributorRegistry } from './diagnostics-contributor';
import type { HealthAggregator } from './health-contributor';

export class DiagnosticsEngine {
  private timeline: TimelineEvent[] = [];

  constructor(
    private readonly kernelVersion: string,
    private readonly diagnosticsRegistry: DiagnosticsContributorRegistry,
    private readonly healthAggregator: HealthAggregator
  ) {}

  recordEvent(message: string): void {
    this.timeline.push({
      timestamp: new Date(),
      message
    });
  }

  async buildReport(): Promise<UnifiedDiagnosticsReport> {
    const contributors = this.diagnosticsRegistry.getContributors();
    const sections: Record<string, DiagnosticsSection> = {};
    let totalScore = 100;

    // Collect sections from all contributors
    for (const contributor of contributors) {
      try {
        const section = await contributor.collect();
        sections[contributor.id] = section;

        // Apply score deductions based on issues severity
        for (const issue of section.issues) {
          totalScore -= SEVERITY_WEIGHTS[issue.severity];
        }
      } catch (error) {
        // If a contributor fails, we log an artificial issue in its name and deduct points.
        sections[contributor.id] = {
          issues: [{
            severity: IssueSeverity.MAJOR,
            componentId: contributor.id,
            message: `Contributor threw an exception: ${error instanceof Error ? error.message : String(error)}`,
            recommendation: 'Fix the contributor logic.'
          }],
          metrics: {}
        };
        totalScore -= SEVERITY_WEIGHTS[IssueSeverity.MAJOR];
      }
    }

    // Floor score at 0
    totalScore = Math.max(0, totalScore);

    // Aggregate overall health
    const health = await this.healthAggregator.aggregate();

    return {
      kernelVersion: this.kernelVersion,
      health,
      score: totalScore,
      timeline: [...this.timeline], // return a copy to prevent external mutation
      contributors: sections
    };
  }

  async generateSnapshot(): Promise<DiagnosticsSnapshot> {
    const report = await this.buildReport();
    
    // Create an immutable snapshot
    return Object.freeze({
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      report: Object.freeze(report)
    });
  }
}
