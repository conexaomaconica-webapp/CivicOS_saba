// ============================================================================
// Service Tokens — Core Kernel
// ============================================================================
// Centralized DI tokens for all core services. Plugins use these tokens to
// resolve or provide implementations via the Container.
// ============================================================================

import { createToken } from './di-container';

import type { AuthProvider } from './contracts/auth.contract';
import type { StorageProvider, BucketManager } from './contracts/storage.contract';
import type { NotificationChannel, NotificationPreferences } from './contracts/notification.contract';
import type { NavigationProvider } from './contracts/navigation.contract';
import type { TenantResolver, TenantContext } from './contracts/tenant.contract';
import type { RBACProvider } from './contracts/rbac.contract';
import type { PlatformCapabilities } from './platform-adapter';
import type { EventBus } from './event-bus';
import type { PluginRegistry } from './plugin-registry';

// ---------------------------------------------------------------------------
// Core Service Tokens
// ---------------------------------------------------------------------------

/** The plugin registry itself. */
export const PLUGIN_REGISTRY = createToken<PluginRegistry>('PluginRegistry');

/** The event bus. */
export const EVENT_BUS = createToken<EventBus>('EventBus');

/** Platform capabilities (web/mobile). */
export const PLATFORM = createToken<PlatformCapabilities>('Platform');

// ---------------------------------------------------------------------------
// Contract Tokens (provided by plugins)
// ---------------------------------------------------------------------------

/** Auth provider (implemented by auth plugin). */
export const AUTH_PROVIDER = createToken<AuthProvider>('AuthProvider');

/** File storage provider (implemented by storage plugin). */
export const STORAGE_PROVIDER = createToken<StorageProvider>('StorageProvider');

/** Bucket manager (implemented by storage plugin). */
export const BUCKET_MANAGER = createToken<BucketManager>('BucketManager');

/** Notification channels (multi-binding). */
export const NOTIFICATION_CHANNEL = createToken<NotificationChannel>('NotificationChannel');

/** Notification preferences. */
export const NOTIFICATION_PREFERENCES = createToken<NotificationPreferences>('NotificationPreferences');

/** Navigation provider. */
export const NAVIGATION_PROVIDER = createToken<NavigationProvider>('NavigationProvider');

/** Tenant resolver. */
export const TENANT_RESOLVER = createToken<TenantResolver>('TenantResolver');

/** Current tenant context (scoped per request). */
export const TENANT_CONTEXT = createToken<TenantContext>('TenantContext');

/** RBAC provider. */
export const RBAC_PROVIDER = createToken<RBACProvider>('RBACProvider');

// ---------------------------------------------------------------------------
// SaaS Framework Extension Tokens
// ---------------------------------------------------------------------------

import type { BillingService } from './contracts/billing.contract';
import type { LicensingService } from './contracts/licensing.contract';
import type { QueueService, JobQueueProvider } from './contracts/jobs.contract';
import type { CommandPaletteService } from './contracts/command-palette.contract';
import type { SchemaRegistryService } from './contracts/schema-registry.contract';
import type { MetadataRegistryService } from './contracts/metadata-registry.contract';

/** Billing service. */
export const BILLING_SERVICE = createToken<BillingService>('BillingService');

/** Licensing service. */
export const LICENSING_SERVICE = createToken<LicensingService>('LicensingService');

/** Scoped client queue service. */
export const QUEUE_SERVICE = createToken<QueueService>('QueueService');

/** Concrete provider strategy for queue execution. */
export const JOB_QUEUE_PROVIDER = createToken<JobQueueProvider>('JobQueueProvider');

/** Searchable Command Palette registry and trigger action executor. */
export const COMMAND_PALETTE_SERVICE = createToken<CommandPaletteService>('CommandPaletteService');

/** Tenant feature toggler service. */
export const FEATURE_FLAG_SERVICE = createToken<any>('FeatureFlagService');

/** Entity fields validation schema registry. */
export const SCHEMA_REGISTRY_SERVICE = createToken<SchemaRegistryService>('SchemaRegistryService');

/** General dynamic registries aggregator service. */
export const METADATA_REGISTRY_SERVICE = createToken<MetadataRegistryService>('MetadataRegistryService');

