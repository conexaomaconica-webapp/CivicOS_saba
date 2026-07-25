import { HostRuntime, CivicOSInstance, KernelProvider } from '@saas/core';
// Import adapters
// import { SupabaseBusinessRepositoryAdapter } from '@saas/infrastructure';

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

    // In a real scenario we'd use NodeManifestReader
    const provider = new KernelProvider(() => ({
      pluginsDir: './plugins',
      reader: {
        // eslint-disable-next-line @typescript-eslint/require-await
        exists: async () => false,
        // eslint-disable-next-line @typescript-eslint/require-await
        readJson: async () => null,
        // eslint-disable-next-line @typescript-eslint/require-await
        listDirectories: async () => [],
      },
      coreVersion: '1.0',
    }));
    
    return await provider.getKernel();
  }
}
