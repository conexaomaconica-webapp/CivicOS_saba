// ============================================================================
// Kernel Provider — CivicOS Runtime
// ============================================================================

import { Kernel, type CivicOSInstance, type KernelBootOptions } from '../kernel';
import type { HostRuntime } from './host-runtime';

/**
 * A generic provider that implements HostRuntime and ensures 
 * the Kernel is only booted once per host process.
 * Hosts can wrap this or use it directly.
 */
export class KernelProvider implements HostRuntime {
  private instance?: CivicOSInstance;

  constructor(
    private readonly bootOptionsFn: () => Promise<KernelBootOptions> | KernelBootOptions
  ) {}

  async getKernel(): Promise<CivicOSInstance> {
    if (!this.instance) {
      const options = await this.bootOptionsFn();
      this.instance = await Kernel.boot(options);
    }
    return this.instance;
  }
}
