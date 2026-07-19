// ============================================================================
// Host Runtime Interface — CivicOS Kernel
// ============================================================================

import type { CivicOSInstance } from '../kernel';

/**
 * Defines the contract that any platform host (Next.js, Electron, CLI) 
 * must implement to provide the CivicOS kernel to the application.
 */
export interface HostRuntime {
  /**
   * Retrieves or initializes the CivicOS instance for the host.
   */
  getKernel(): Promise<CivicOSInstance>;
}
