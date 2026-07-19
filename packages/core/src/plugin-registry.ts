// ============================================================================
// Plugin Registry — Core Kernel
// ============================================================================
// Manages plugin lifecycle: registration, dependency resolution (topological
// sort), initialization order, and graceful teardown. The registry is the
// single source of truth for all loaded plugins.
//
// INVARIANT: This module contains ZERO business logic.
// ============================================================================

import type { Result } from '@saas/shared';
import type { PluginContext } from './plugins/plugin-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginRuntimeManifest {
  readonly minCoreVersion?: string;
  readonly maxCoreVersion?: string;
  readonly sandbox?: 'logical' | 'isolate';
  readonly permissions?: readonly string[];
  readonly services?: readonly string[];
}

/**
 * Metadata that every plugin must declare.
 * @version 1.0.0 (Platform Freeze)
 * @stable
 */
export interface PluginManifest {
  /** Unique identifier, e.g. "auth", "billing". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Semver version string. */
  readonly version: string;
  /** IDs of plugins this plugin depends on (must be initialized first). */
  readonly dependencies?: readonly string[];
  /** Runtime constraints and permissions */
  readonly runtime?: PluginRuntimeManifest;
}



/** Minimal logger contract injected into plugins. */
export interface PluginLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/** Read-only view of the event bus given to plugins. */
export interface EventBusReader {
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

/** Route definition a plugin can contribute. */
export interface RouteDefinition {
  /** URL path segment, e.g. "/dashboard". */
  readonly path: string;
  /** Lazy-loaded React component. */
  readonly component: () => Promise<{ default: React.ComponentType }>;
  /** Optional layout wrapper. */
  readonly layout?: () => Promise<{ default: React.ComponentType }>;
  /** Required permissions to access this route. */
  readonly permissions?: readonly string[];
}

/** API route definition a plugin can contribute. */
export interface ApiRouteDefinition {
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly handler: (request: Request) => Promise<Response>;
  readonly permissions?: readonly string[];
}

/** Navigation item a plugin can contribute to the shell UI. */
export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly path: string;
  readonly order?: number;
  readonly badge?: string | number;
  readonly children?: readonly NavigationItem[];
}

/** Middleware definition a plugin can contribute. */
export interface MiddlewareDefinition {
  readonly id: string;
  readonly order: number;
  readonly handler: (
    request: Request,
    next: () => Promise<Response>,
  ) => Promise<Response>;
}

/** Migration definition for plugin database schemas. */
export interface MigrationDefinition {
  readonly version: string;
  readonly description: string;
  readonly up: string; // SQL
  readonly down: string; // SQL
}

// ---------------------------------------------------------------------------
// Plugin Interface
// ---------------------------------------------------------------------------

/** Contract every plugin must implement to be loaded by the Core. */
export interface Plugin {
  readonly manifest: PluginManifest;

  /** Called once during app bootstrap. Register services, subscribe to events. */
  initialize(context: PluginContext): Promise<void>;

  /** Called during graceful shutdown. Clean up resources. */
  destroy?(): Promise<void>;

  // -- Extension points (all optional) --

  /** Page routes this plugin contributes. */
  routes?(): RouteDefinition[];

  /** API routes this plugin contributes. */
  apiRoutes?(): ApiRouteDefinition[];

  /** Navigation items for the shell sidebar/header. */
  navigationItems?(): NavigationItem[];

  /** Middlewares this plugin contributes to the request pipeline. */
  middlewares?(): MiddlewareDefinition[];

  /** Database migrations this plugin manages. */
  migrations?(): MigrationDefinition[];
}

// ---------------------------------------------------------------------------
// Plugin Lifecycle
// ---------------------------------------------------------------------------

export type PluginState =
  | 'registered'
  | 'initializing'
  | 'ready'
  | 'suspended'
  | 'error'
  | 'destroyed';

interface PluginEntry {
  plugin: Plugin;
  state: PluginState;
  error?: Error;
}

// ---------------------------------------------------------------------------
// Topological Sort
// ---------------------------------------------------------------------------

function topologicalSort(
  entries: Map<string, PluginEntry>,
): Result<string[], string> {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: string[] = [];

  function visit(id: string): string | null {
    if (visited.has(id)) return null;
    if (visiting.has(id)) return `Circular dependency detected involving plugin "${id}"`;

    visiting.add(id);
    const entry = entries.get(id);
    if (!entry) return `Missing dependency: plugin "${id}" is not registered`;

    const deps = entry.plugin.manifest.dependencies ?? [];
    for (const dep of deps) {
      const err = visit(dep);
      if (err) return err;
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
    return null;
  }

  for (const id of entries.keys()) {
    const err = visit(id);
    if (err) return { ok: false, error: err };
  }

  return { ok: true, value: sorted };
}

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

export class PluginRegistry {
  private readonly entries = new Map<string, PluginEntry>();
  private initOrder: string[] = [];
  private _initialized = false;

  /** Whether the registry has been fully initialized. */
  get initialized(): boolean {
    return this._initialized;
  }

  // -- Registration ---------------------------------------------------------

  /** Register a plugin. Must be called before `initializeAll()`. */
  register(plugin: Plugin): void {
    if (this._initialized) {
      throw new Error(
        `Cannot register plugin "${plugin.manifest.id}" after initialization.`,
      );
    }
    if (this.entries.has(plugin.manifest.id)) {
      throw new Error(
        `Plugin "${plugin.manifest.id}" is already registered.`,
      );
    }
    this.entries.set(plugin.manifest.id, {
      plugin,
      state: 'registered',
    });
  }

  /** Register multiple plugins at once. */
  registerAll(plugins: Plugin[]): void {
    for (const plugin of plugins) {
      this.register(plugin);
    }
  }

  // -- Initialization -------------------------------------------------------

  /** Initialize all registered plugins in dependency order. */
  async initializeAll(contextFactory: (pluginId: string) => PluginContext): Promise<void> {
    if (this._initialized) {
      throw new Error('Plugin registry is already initialized.');
    }

    const sortResult = topologicalSort(this.entries);
    if (!sortResult.ok) {
      throw new Error(`Plugin dependency resolution failed: ${sortResult.error}`);
    }

    this.initOrder = sortResult.value;

    for (const id of this.initOrder) {
      const entry = this.entries.get(id)!;
      entry.state = 'initializing';
      try {
        const context = contextFactory(id);
        await entry.plugin.initialize(context);
        entry.state = 'ready';
      } catch (err) {
        entry.state = 'error';
        entry.error = err instanceof Error ? err : new Error(String(err));
        throw new Error(
          `Plugin "${id}" failed to initialize: ${entry.error.message}`,
        );
      }
    }

    this._initialized = true;
  }

  // -- Teardown -------------------------------------------------------------

  /** Gracefully destroy all plugins in reverse initialization order. */
  async destroyAll(): Promise<void> {
    const reversed = [...this.initOrder].reverse();
    for (const id of reversed) {
      const entry = this.entries.get(id);
      if (entry && entry.plugin.destroy) {
        try {
          await entry.plugin.destroy();
          entry.state = 'destroyed';
        } catch {
          entry.state = 'error';
        }
      }
    }
    this._initialized = false;
  }

  // -- Queries --------------------------------------------------------------

  /** Get a plugin by ID. */
  get(id: string): Plugin | undefined {
    return this.entries.get(id)?.plugin;
  }

  /** Get the state of a plugin. */
  getState(id: string): PluginState | undefined {
    return this.entries.get(id)?.state;
  }

  /** List all registered plugin IDs. */
  listIds(): string[] {
    return Array.from(this.entries.keys());
  }

  /** List all plugins in initialization order. */
  listInOrder(): Plugin[] {
    return this.initOrder.map((id) => this.entries.get(id)!.plugin);
  }

  /** Collect all routes from all ready plugins. */
  collectRoutes(): RouteDefinition[] {
    return this.readyPlugins().flatMap((p) => p.routes?.() ?? []);
  }

  /** Collect all API routes from all ready plugins. */
  collectApiRoutes(): ApiRouteDefinition[] {
    return this.readyPlugins().flatMap((p) => p.apiRoutes?.() ?? []);
  }

  /** Collect all navigation items from all ready plugins. */
  collectNavigationItems(): NavigationItem[] {
    return this.readyPlugins()
      .flatMap((p) => p.navigationItems?.() ?? [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /** Collect all middlewares from all ready plugins. */
  collectMiddlewares(): MiddlewareDefinition[] {
    return this.readyPlugins()
      .flatMap((p) => p.middlewares?.() ?? [])
      .sort((a, b) => a.order - b.order);
  }

  /** Collect all migrations from all ready plugins. */
  collectMigrations(): MigrationDefinition[] {
    return this.readyPlugins().flatMap((p) => p.migrations?.() ?? []);
  }

  // -- Helpers --------------------------------------------------------------

  private readyPlugins(): Plugin[] {
    return Array.from(this.entries.values())
      .filter((e) => e.state === 'ready')
      .map((e) => e.plugin);
  }
}
