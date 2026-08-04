import { HostRuntime, CivicOSInstance, KernelProvider, NodeManifestReader } from '@saas/core';

export class NextRuntime implements HostRuntime {
  private static instance: CivicOSInstance | null = null;
  private static bootPromise: Promise<CivicOSInstance> | null = null;

  async getKernel(): Promise<CivicOSInstance> {
    if (NextRuntime.instance) {
      return NextRuntime.instance;
    }

    if (NextRuntime.bootPromise) {
      return NextRuntime.bootPromise;
    }

    NextRuntime.bootPromise = this.boot();
    NextRuntime.instance = await NextRuntime.bootPromise;
    return NextRuntime.instance;
  }

  private async boot(): Promise<CivicOSInstance> {
    if (typeof window !== 'undefined') {
      console.warn('NextRuntime.boot() called on the client side. CivicOS should only boot on the server.');
    }

    const provider = new KernelProvider(() => ({
      pluginsDir: './plugins',
      reader: new NodeManifestReader(),
      coreVersion: '1.0.0',
    }));
    
    return await provider.getKernel();
  }
}
