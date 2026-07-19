// ============================================================================
// Kernel Lifecycle Manager — CivicOS Lifecycle
// ============================================================================

import type { HostRuntime } from '../runtime/host-runtime';

export enum KernelState {
  IDLE = 'IDLE',
  BOOTING = 'BOOTING',
  READY = 'READY',
  SHUTTING_DOWN = 'SHUTTING_DOWN',
  SHUTDOWN = 'SHUTDOWN'
}

export class KernelLifecycle {
  private state: KernelState = KernelState.IDLE;

  constructor(private readonly provider: HostRuntime) {}

  getState(): KernelState {
    return this.state;
  }

  async boot(): Promise<void> {
    if (this.state !== KernelState.IDLE && this.state !== KernelState.SHUTDOWN) {
      throw new Error(`Cannot boot kernel from state: ${this.state}`);
    }
    this.state = KernelState.BOOTING;
    try {
      await this.provider.getKernel();
      this.state = KernelState.READY;
    } catch (err) {
      this.state = KernelState.IDLE;
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    if (this.state !== KernelState.READY) {
      return;
    }
    this.state = KernelState.SHUTTING_DOWN;
    // In the future, this would call Kernel.shutdown() to cleanly stop plugins and event bus
    this.state = KernelState.SHUTDOWN;
  }

  async reload(): Promise<void> {
    await this.shutdown();
    await this.boot();
  }
}
