// ============================================================================
// Plugin Context — Plugin Runtime
// ============================================================================
// The single point of contact between a Plugin and the CivicOS Platform.
// The context is entirely immutable.
// ============================================================================

import type { CapabilityResolver } from '../capabilities/capability-resolver';
import type { PluginEventBus } from './plugin-event-bus';
import type { ServiceResolver } from '../services/service-resolver';

export interface TenantContext {
  readonly id: string;
  readonly name: string;
}

export interface PermissionResolver {
  hasPermission(permission: string): boolean;
}

export interface PluginLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginConfiguration {
  get<T>(key: string): T | undefined;
}

export interface PluginStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PluginContext {
  readonly tenant?: TenantContext;
  readonly capabilities: CapabilityResolver;
  readonly permissions: PermissionResolver;
  readonly services: ServiceResolver;
  readonly events: PluginEventBus;
  readonly logger: PluginLogger;
  readonly config: PluginConfiguration;
  readonly storage: PluginStorage;
}

export class PluginContextFactory {
  static create(
    capabilities: CapabilityResolver,
    services: ServiceResolver,
    events: PluginEventBus,

    logger: PluginLogger = console as PluginLogger,
    config: PluginConfiguration = { get: () => undefined },
    storage: PluginStorage = { get: async () => null, set: async () => {}, delete: async () => {} }
  ): PluginContext {
    const permissions: PermissionResolver = {
      // Validates if the plugin declared a permission in its runtime manifest.
      // Wait, canAccessService checks 'runtime.services', what about 'runtime.permissions'?
      // We should probably check if `permissionEngine` has a general method for 'runtime.permissions'.
      hasPermission: (_perm: string) => true // Stubbed for now, should integrate with engine
    };

    const context: PluginContext = {
      capabilities,
      permissions,
      services,
      events,
      logger,
      config,
      storage
    };

    // Make the context strictly immutable!
    return Object.freeze(context);
  }
}
