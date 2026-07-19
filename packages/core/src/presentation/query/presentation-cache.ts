import type { PresentationSnapshot, PresentationContext } from '../presentation-types';
import * as crypto from 'crypto';

export type SnapshotCacheKey = string;

export interface PresentationCache {
  get(key: SnapshotCacheKey): PresentationSnapshot | undefined;
  set(key: SnapshotCacheKey, snapshot: PresentationSnapshot): void;
  clear(): void;
}

/**
 * Deterministically generates a cache key (hash) from a PresentationContext.
 * Modifying any parameter (including any version counter) will completely alter the key.
 */
export function generateCacheKey(context: PresentationContext): SnapshotCacheKey {
  // Sort capabilities and permissions to ensure consistent hashing even if order changes
  const stableContext = {
    tenantId: context.tenantId,
    userId: context.userId ?? null,
    locale: context.locale,
    theme: context.theme ?? null,
    timezone: context.timezone ?? null,
    capabilities: [...context.capabilities].sort(),
    permissions: [...context.permissions].sort(),
    policyDecision: context.policyDecision ? Object.keys(context.policyDecision).sort().reduce((acc, k) => {
      const decision = context.policyDecision![k];
      acc[k] = decision !== undefined ? decision : false;
      return acc;
    }, {} as Record<string, boolean>) : null,
    versions: {
      registryVersion: context.versions.registryVersion,
      capabilityVersion: context.versions.capabilityVersion,
      licenseVersion: context.versions.licenseVersion,
      permissionVersion: context.versions.permissionVersion,
      policyVersion: context.versions.policyVersion,
      layoutVersion: context.versions.layoutVersion,
    }
  };

  const serialized = JSON.stringify(stableContext);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * LRU In-Memory implementation of the Presentation Cache.
 */
export class MemoryPresentationCache implements PresentationCache {
  private readonly cache = new Map<SnapshotCacheKey, PresentationSnapshot>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  get(key: SnapshotCacheKey): PresentationSnapshot | undefined {
    const snapshot = this.cache.get(key);
    if (snapshot) {
      // LRU bump: remove and re-insert at the end (Map keeps insertion order)
      this.cache.delete(key);
      this.cache.set(key, snapshot);
    }
    return snapshot;
  }

  set(key: SnapshotCacheKey, snapshot: PresentationSnapshot): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, snapshot);
  }

  clear(): void {
    this.cache.clear();
  }
}
