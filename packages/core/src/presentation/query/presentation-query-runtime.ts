import type { PresentationContext, PresentationSnapshot } from '../presentation-types';
import type { PresentationCache } from './presentation-cache';
import { generateCacheKey } from './presentation-cache';
import type { PresentationSnapshotBuilder } from './presentation-snapshot-builder';

/**
 * The single public entry point for all Presentation queries in the CivicOS Kernel.
 * Encapsulates the cache and the snapshot builder.
 * None of the internal registries are exposed here.
 */
export class PresentationQueryRuntime {
  constructor(
    private readonly snapshotBuilder: PresentationSnapshotBuilder,
    private readonly cache: PresentationCache
  ) {}

  /**
   * Retrieves or builds the deterministic PresentationSnapshot for the given context.
   * If a cached version exists and the context versions match, the cache is returned.
   */
  snapshot(context: PresentationContext): PresentationSnapshot {
    const key = generateCacheKey(context);
    
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const built = this.snapshotBuilder.build(context);
    this.cache.set(key, built);
    
    return built;
  }
}
