// ============================================================================
// Diagnostics & Health Types — Diagnostics Platform (AC-6D)
// ============================================================================

export enum HealthStatus {
  UP = 'UP',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN'
}

export enum IssueSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  INFO = 'INFO'
}

export const SEVERITY_WEIGHTS: Record<IssueSeverity, number> = {
  [IssueSeverity.CRITICAL]: 30,
  [IssueSeverity.MAJOR]: 10,
  [IssueSeverity.MINOR]: 3,
  [IssueSeverity.INFO]: 0
};

export interface DiagnosticIssue {
  readonly severity: IssueSeverity;
  readonly message: string;
  readonly recommendation?: string;
  readonly componentId: string;
}

export interface DiagnosticsSection {
  readonly issues: DiagnosticIssue[];
  readonly metrics: Record<string, unknown>;
}

export interface TimelineEvent {
  readonly timestamp: Date;
  readonly message: string;
}

export interface UnifiedDiagnosticsReport {
  readonly kernelVersion: string;
  readonly health: HealthStatus;
  readonly score: number;
  readonly timeline: TimelineEvent[];
  readonly contributors: Record<string, DiagnosticsSection>;
}

export interface DiagnosticsSnapshot {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly report: UnifiedDiagnosticsReport;
}
