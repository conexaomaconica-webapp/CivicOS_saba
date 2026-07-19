import { AsyncLocalStorage } from 'async_hooks';
import type { RequestContext, RequestMetadata } from '@saas/core';

export class AsyncRequestContext implements RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestMetadata>();

  get(): RequestMetadata | undefined {
    return this.storage.getStore();
  }

  async run<T>(metadata: RequestMetadata, callback: () => T | Promise<T>): Promise<T> {
    return this.storage.run(metadata, callback);
  }
}
