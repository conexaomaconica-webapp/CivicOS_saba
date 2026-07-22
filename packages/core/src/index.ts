// ============================================================================
// Core Kernel — Public API
// ============================================================================
// Single entry point for the entire Core package. All public types,
// classes, and tokens are re-exported from here.
// ============================================================================

// -- Kernel (Boot Orchestrator) ---------------------------------------------
export { Kernel } from './kernel';
export type { KernelBootOptions, CivicOSInstance, BootLogger } from './kernel';

// -- Runtime & Host Abstractions --------------------------------------------
export { KernelProvider } from './runtime/kernel-provider';
export type { HostRuntime } from './runtime/host-runtime';

// -- Lifecycle --------------------------------------------------------------
export { KernelLifecycle, KernelState } from './lifecycle/kernel-lifecycle';

// -- Observability ----------------------------------------------------------
export type { StructuredLogger, LogEntry } from './observability/logger';
export type { RequestContext, RequestMetadata } from './observability/request-context';

// -- Transactions -----------------------------------------------------------
export type { UnitOfWork, TransactionManager } from './transactions/transaction-manager';

// -- Manifest Loader --------------------------------------------------------
export { ManifestLoader } from './manifest-loader';
export type {
  ManifestReader,
  FullLoadedManifest,
  ManifestRouteEntry,
  ManifestWidgetEntry,
  ManifestNavigationEntry,
  ManifestCapabilities,
  ManifestPermissionEntry,
  ManifestSettingEntry,
  ManifestSchemaEntry,
  ManifestCommandEntry,
  ManifestJobEntry,
  ManifestEventEntry,
} from './manifest-loader';

// -- Plugin Lifecycle Manager -----------------------------------------------
export { PluginLifecycleManager } from './plugin-lifecycle';
export type {
  PluginLifecycleState,
  LifecycleEntry,
  LifecycleEventHandler,
} from './plugin-lifecycle';
export type { PluginLifecycleHooks } from './plugins/plugin-hooks';
export type { PluginContext } from './plugins/plugin-context';

// -- Registry Manager -------------------------------------------------------
export {
  RegistryManager,
  PermissionRegistry,
  SettingsRegistry,
} from './registry-manager';

export type {
  RegisteredPermission,
  RegisteredSetting,
} from './registry-manager';

// -- Plugin Registry --------------------------------------------------------
export {
  PluginRegistry,
} from './plugin-registry';

export {
  PluginValidator,
} from './plugin-validator';

export type {
  LoadedManifest,
  ValidationResult,
} from './plugin-validator';

export type {
  Plugin,
  PluginManifest,
  PluginLogger,
  PluginState,
  EventBusReader,
  RouteDefinition,
  ApiRouteDefinition,
  MiddlewareDefinition,
  MigrationDefinition,
} from './plugin-registry';

// -- Event Bus --------------------------------------------------------------
export {
  EventBus,
} from './event-bus';

export type {
  EventHandler,
  Unsubscribe,
  EventBusOptions,
  DeadLetter,
} from './event-bus';

// -- DI Container -----------------------------------------------------------
export {
  Container,
  BindingBuilder,
  createToken,
} from './di-container';

export type {
  ServiceToken,
  Lifetime,
} from './di-container';

// -- Platform Adapter -------------------------------------------------------
export {
  WebStorageAdapter,
  createWebPlatform,
} from './platform-adapter';

export type {
  PlatformType,
  PlatformCapabilities,
  CameraAdapter,
  CameraOptions,
  CameraResult,
  GeolocationAdapter,
  GeolocationOptions,
  Position,
  PushAdapter,
  PushToken,
  PushNotification,
  PushAction,
  HapticsAdapter,
  StorageAdapter,
  PermissionStatus,
} from './platform-adapter';

// -- Middleware Pipeline ----------------------------------------------------
export {
  MiddlewarePipeline,
} from './middleware-pipeline';

export type {
  MiddlewareHandler,
  Middleware,
} from './middleware-pipeline';

// -- Service Tokens ---------------------------------------------------------
export {
  PLUGIN_REGISTRY,
  EVENT_BUS,
  PLATFORM,
  AUTH_PROVIDER,
  STORAGE_PROVIDER,
  BUCKET_MANAGER,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_PREFERENCES,
  NAVIGATION_PROVIDER,
  TENANT_RESOLVER,
  TENANT_CONTEXT,
  RBAC_PROVIDER,
  BILLING_SERVICE,
  LICENSING_SERVICE,
  QUEUE_SERVICE,
  JOB_QUEUE_PROVIDER,
  COMMAND_PALETTE_SERVICE,
  FEATURE_FLAG_SERVICE,
  SCHEMA_REGISTRY_SERVICE,
  METADATA_REGISTRY_SERVICE,
} from './tokens';

// -- Contracts (type-only re-export) ----------------------------------------
export type {
  User,
  Session,
  AuthCredentials,
  EmailPasswordCredentials,
  OAuthCredentials,
  MagicLinkCredentials,
  AuthProvider,
  AuthEvent,
  FileObject,
  UploadOptions,
  ListOptions,
  ListResult,
  SignedUrlOptions,
  StorageProvider,
  BucketManager,
  BucketInfo,
  NotificationPayload,
  ChannelType,
  NotificationChannel,
  NotificationResult,
  NotificationPreferences,
  ChannelPreference,
  AppNavigationItem,
  AppRouteDefinition,
  RouteMeta,
  NavigationProvider,
  Tenant,
  TenantSettings,
  TenantBranding,
  TenantContext,
  TenantResolutionStrategy,
  TenantResolver,
  CreateTenantInput,
  Permission,
  Role,
  RBACProvider,
  CreateRoleInput,
  Subscription,
  PaymentDetails,
  CommissionDetails,
  BillingService,
  LicenseLimits,
  LicensingService,
  JobPayload,
  JobOptions,
  Job,
  JobQueueProvider,
  QueueService,
  UIContext,
  CommandAction,
  Command,
  CommandPaletteService,
  FieldType,
  EntityField,
  EntitySchema,
  SchemaRegistryService,
  SearchResult,
  SearchProvider,
  Widget,
  DashboardCard,
  NavigationRegistryItem,
  SettingDefinition,
  ImporterDefinition,
  ExporterDefinition,
  NotificationTrigger,
  AIPromptDefinition,
  MetadataRegistryService,
} from './contracts';

// -- Presentation Engine ----------------------------------------------------
export type {
  PresentationContext,
  PresentationSnapshot,
  LayoutDefinition,
  SlotDefinition,
} from './presentation/presentation-types';

// -- Navigation Engine ------------------------------------------------------
export type {
  NavigationItem,
} from './navigation/navigation-types';
