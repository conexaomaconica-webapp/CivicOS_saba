// ============================================================================
// Dependency Injection Tokens — Core Kernel
// ============================================================================
// Type-safe tokens for resolving core infrastructure services.
// Avoids magic strings and ensures the Container returns correctly typed instances.
// ============================================================================

export interface Token<T = any> {
  readonly _phantom?: T;
  readonly symbol: symbol;
  readonly description: string;
}

export function createToken<T>(description: string): Token<T> {
  return {
    symbol: Symbol(description),
    description,
  };
}

// These are declared without actual imports to avoid circular dependencies.
// The types will be inferred where they are actually used, or we can import just types.

import type { EventBus } from '../event-bus';
import type { RegistryManager } from '../registry-manager';
import type { CapabilityResolver } from '../capabilities/capability-resolver';
import type { LicensingEngine } from '../licensing/licensing-engine';
import type { QuotaEngine } from '../licensing/quota-engine';
import type { FeatureEngine } from '../capabilities/feature-engine';
import type { PluginLifecycleManager } from '../plugin-lifecycle';
import type { PluginValidator } from '../plugin-validator';

export const CORE_TOKENS = {
  EventBus: createToken<EventBus>('EventBus'),
  RegistryManager: createToken<RegistryManager>('RegistryManager'),
  PluginLifecycleManager: createToken<PluginLifecycleManager>('PluginLifecycleManager'),
  PluginValidator: createToken<PluginValidator>('PluginValidator'),
  CapabilityResolver: createToken<CapabilityResolver>('CapabilityResolver'),
  LicensingEngine: createToken<LicensingEngine>('LicensingEngine'),
  QuotaEngine: createToken<QuotaEngine>('QuotaEngine'),
  FeatureEngine: createToken<FeatureEngine>('FeatureEngine'),
} as const;
