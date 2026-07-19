// ============================================================================
// JSON Diagnostics Exporter — Diagnostics Platform (AC-6D)
// ============================================================================

import type { DiagnosticsSnapshot } from './diagnostics-types';

export interface DiagnosticsExporter {
  export(snapshot: DiagnosticsSnapshot): string;
}

export class JsonDiagnosticsExporter implements DiagnosticsExporter {
  export(snapshot: DiagnosticsSnapshot): string {
    // Stringify with formatting for human readability and consistent export.
    return JSON.stringify(snapshot, null, 2);
  }
}
