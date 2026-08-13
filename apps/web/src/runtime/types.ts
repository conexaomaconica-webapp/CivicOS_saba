import type { PresentationSnapshot } from '@saas/core';

/**
 * Serialized result of the CivicOS server-side boot, streamed to the client
 * through React Server Components. The kernel itself never reaches the browser
 * (it depends on Node-only APIs), only the plain data the UI consumes.
 */
export interface BootData {
  diagnostics: unknown;
  defaultSnapshot: PresentationSnapshot | null;
  error: string | null;
}