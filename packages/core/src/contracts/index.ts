// ============================================================================
// Contracts — Barrel Export
// ============================================================================

export type {
  User,
  Session,
  AuthCredentials,
  EmailPasswordCredentials,
  OAuthCredentials,
  MagicLinkCredentials,
  AuthProvider,
  AuthEvent,
} from './auth.contract';

export type {
  FileObject,
  UploadOptions,
  ListOptions,
  ListResult,
  SignedUrlOptions,
  StorageProvider,
  BucketManager,
  BucketInfo,
} from './storage.contract';

export type {
  NotificationPayload,
  ChannelType,
  NotificationChannel,
  NotificationResult,
  NotificationPreferences,
  ChannelPreference,
} from './notification.contract';

export type {
  AppNavigationItem,
  AppRouteDefinition,
  RouteMeta,
  NavigationProvider,
} from './navigation.contract';

export type {
  Tenant,
  TenantSettings,
  TenantBranding,
  TenantContext,
  TenantResolutionStrategy,
  TenantResolver,
  CreateTenantInput,
} from './tenant.contract';

export type {
  Permission,
  Role,
  RBACProvider,
  CreateRoleInput,
} from './rbac.contract';

export type {
  Subscription,
  PaymentDetails,
  CommissionDetails,
  BillingService,
} from './billing.contract';

export type {
  LicenseLimits,
  LicensingService,
} from './licensing.contract';

export type {
  JobPayload,
  JobOptions,
  Job,
  JobQueueProvider,
  QueueService,
} from './jobs.contract';

export type {
  UIContext,
  CommandAction,
  Command,
  CommandPaletteService,
} from './command-palette.contract';

export type {
  FieldType,
  EntityField,
  EntitySchema,
  SchemaRegistryService,
} from './schema-registry.contract';

export type {
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
} from './metadata-registry.contract';

