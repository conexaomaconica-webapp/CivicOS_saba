import type {
  PluginManifest,
  RouteDefinition,
  ApiRouteDefinition,
  PluginContext,
  PluginLifecycleHooks,
  PresentationSnapshot,
} from '@saas/core';
import type { NavigationItem } from './navigation/navigation-types';

export type { PluginContext, PluginLifecycleHooks, PresentationSnapshot };

export * from './navigation/navigation-types';

export interface CapabilityDefinition {
  readonly provides?: readonly string[];
  readonly requires?: readonly string[];
}

export interface PermissionDefinition {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export interface WidgetDefinition {
  readonly id: string;
  readonly slot: string;
  readonly component: string;
  readonly order: number;
  readonly capability?: string;
  readonly props?: Record<string, unknown>;
}

export interface SchemaField {
  readonly name: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text';
  readonly required: boolean;
}

export interface SchemaDefinition {
  readonly name: string;
  readonly label: string;
  readonly fields: readonly SchemaField[];
}

export interface SettingDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly default: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly capability?: string;
}

export interface CommandDefinition {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly category: string;
  readonly permission?: string;
  readonly action: 'navigate' | 'callback';
  readonly target: string;
}

export interface JobDefinition {
  readonly id: string;
  readonly description?: string;
  readonly schedule: string;
  readonly handler: string;
  readonly retries?: number;
}

export interface EventDefinition {
  readonly name: string;
  readonly description?: string;
  readonly payload?: Record<string, string>;
}

export interface PluginConfig {
  readonly manifest: PluginManifest;
  readonly capabilities?: CapabilityDefinition;
  readonly routes?: readonly RouteDefinition[];
  readonly apiRoutes?: readonly ApiRouteDefinition[];
  readonly permissions?: readonly PermissionDefinition[];
  readonly navigation?: readonly NavigationItem[];
  readonly widgets?: readonly WidgetDefinition[];
  readonly schemas?: readonly SchemaDefinition[];
  readonly settings?: readonly SettingDefinition[];
  readonly commands?: readonly CommandDefinition[];
  readonly jobs?: readonly JobDefinition[];
  readonly eventsPublished?: readonly EventDefinition[];
  readonly eventsConsumed?: readonly string[];
  readonly policies?: readonly string[];
}

/** Builder helper for plugins */
export function definePlugin(config: PluginConfig): PluginConfig {
  return config;
}

/** Builder helper for capabilities */
export function defineCapability(config: CapabilityDefinition): CapabilityDefinition {
  return config;
}

/** Builder helper for routes */
export function defineRoute(config: RouteDefinition): RouteDefinition {
  return config;
}

/** Builder helper for widgets */
export function defineWidget(config: WidgetDefinition): WidgetDefinition {
  return config;
}

/** Builder helper for policies */
export function definePolicy(config: string): string {
  return config;
}

/** Builder helper for workflows */
export function defineWorkflow(config: string): string {
  return config;
}

/** Builder helper for jobs */
export function defineJob(config: JobDefinition): JobDefinition {
  return config;
}

/** Builder helper for events */
export function defineEvent(config: EventDefinition): EventDefinition {
  return config;
}
