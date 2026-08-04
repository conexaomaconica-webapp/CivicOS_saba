// ============================================================================
// Manifest Loader — Core Kernel
// ============================================================================
// Reads and parses the split manifest files from a plugin's manifest directory.
// Returns a fully typed LoadedManifest object for each discovered plugin.
//
// INVARIANT: This module contains ZERO business logic.
// It only reads JSON files and assembles typed objects.
// ============================================================================

import type { PluginManifest } from './plugin-registry';
import type { LoadedManifest } from './plugin-validator';

// ---------------------------------------------------------------------------
// Manifest Sub-Types (parsed from JSON)
// ---------------------------------------------------------------------------

export interface ManifestRouteEntry {
  readonly path: string;
  readonly page: string;
  readonly public?: boolean;
  readonly permission?: string;
  readonly capability?: string;
  readonly layout?: string;
  readonly seo?: {
    readonly title?: string;
    readonly description?: string;
  };
}

export interface ManifestWidgetEntry {
  readonly id: string;
  readonly slot: string;
  readonly component: string;
  readonly order: number;
  readonly capability?: string;
  readonly props?: Record<string, unknown>;
}

export interface ManifestNavigationEntry {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly path: string;
  readonly order?: number;
  readonly permission?: string;
  readonly showInSidebar?: boolean;
  readonly children?: ManifestNavigationEntry[];
}

export interface ManifestPermissionEntry {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export interface ManifestCapabilityEntry {
  readonly id: string;
  readonly type?: 'service' | 'slot' | 'api';
}

export interface ManifestCapabilities {
  readonly provides?: readonly (string | ManifestCapabilityEntry)[];
  readonly requires?: readonly string[];
}

export interface ManifestSettingEntry {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly default: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly capability?: string;
}

export interface ManifestEventEntry {
  readonly name: string;
  readonly description?: string;
  readonly payload?: Record<string, string>;
}

export interface ManifestSchemaField {
  readonly name: string;
  readonly label: string;
  readonly type: string;
  readonly required: boolean;
}

export interface ManifestSchemaEntry {
  readonly name: string;
  readonly label: string;
  readonly fields: ManifestSchemaField[];
}

export interface ManifestCommandEntry {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly category: string;
  readonly permission?: string;
  readonly action: 'navigate' | 'callback';
  readonly target: string;
}

export interface ManifestJobEntry {
  readonly id: string;
  readonly description?: string;
  readonly schedule: string;
  readonly handler: string;
  readonly retries?: number;
}

export interface ManifestSlotEntry {
  readonly id: string;
  readonly description?: string;
}

export interface ManifestLayoutEntry {
  readonly id: string;
  readonly component: string;
  readonly slots: string[];
}

// ---------------------------------------------------------------------------
// Full Loaded Manifest (extends the validator's LoadedManifest)
// ---------------------------------------------------------------------------

export interface FullLoadedManifest extends LoadedManifest {
  readonly permissions?: ManifestPermissionEntry[];
  readonly settings?: ManifestSettingEntry[];
  readonly slots?: ManifestSlotEntry[];
  readonly layouts?: ManifestLayoutEntry[];
  readonly schemas?: ManifestSchemaEntry[];
  readonly commands?: ManifestCommandEntry[];
  readonly jobs?: ManifestJobEntry[];
  readonly eventsPublished?: ManifestEventEntry[];
  readonly eventsConsumed?: string[];
}

// ---------------------------------------------------------------------------
// Reader Interface (abstraction over filesystem)
// ---------------------------------------------------------------------------

/**
 * Abstracts file reading so the loader works in Node.js, Edge Runtime,
 * or test environments equally.
 */
export interface ManifestReader {
  /** Returns true if the file or directory exists. */
  exists(path: string): Promise<boolean>;
  /** Reads a JSON file and returns the parsed object. Returns null if not found. */
  readJson<T>(path: string): Promise<T | null>;
  /** Lists subdirectories in a given directory. */
  listDirectories(path: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Manifest Loader
// ---------------------------------------------------------------------------

export class ManifestLoader {
  constructor(private readonly reader: ManifestReader) {}

  /**
   * Discovers all plugins in the given directory and loads their manifests.
   */
  async discoverAndLoad(pluginsDir: string): Promise<FullLoadedManifest[]> {
    const pluginDirs = await this.reader.listDirectories(pluginsDir);
    const manifests: FullLoadedManifest[] = [];

    for (const dir of pluginDirs) {
      const pluginPath = `${pluginsDir}/${dir}`;
      const manifest = await this.loadPlugin(pluginPath);
      if (manifest) {
        manifests.push(manifest);
      }
    }

    return manifests;
  }

  /**
   * Loads all manifest files for a single plugin directory.
   */
  async loadPlugin(pluginPath: string): Promise<FullLoadedManifest | null> {
    // 1. Read the root plugin.json (or manifest/plugin.json)
    let pluginJson = await this.reader.readJson<PluginManifest>(`${pluginPath}/manifest/plugin.json`);
    if (!pluginJson) {
      pluginJson = await this.reader.readJson<PluginManifest>(`${pluginPath}/plugin.json`);
    }
    if (!pluginJson) {
      return null; // Not a valid plugin directory
    }

    const manifestDir = `${pluginPath}/manifest`;
    const hasManifestDir = await this.reader.exists(manifestDir);
    const base = hasManifestDir ? manifestDir : pluginPath;

    // 2. Load all split manifest files in parallel
    const [
      capabilities,
      routes,
      widgets,
      navigation,
      permissions,
      settings,
      slots,
      layouts,
      schemas,
      commands,
      jobs,
      events,
    ] = await Promise.all([
      this.reader.readJson<ManifestCapabilities>(`${base}/capabilities.json`),
      this.reader.readJson<ManifestRouteEntry[]>(`${base}/routes.json`),
      this.reader.readJson<ManifestWidgetEntry[]>(`${base}/widgets.json`),
      this.reader.readJson<ManifestNavigationEntry[]>(`${base}/navigation.json`),
      this.reader.readJson<ManifestPermissionEntry[]>(`${base}/permissions.json`),
      this.reader.readJson<ManifestSettingEntry[]>(`${base}/settings.json`),
      this.reader.readJson<ManifestSlotEntry[]>(`${base}/slots.json`),
      this.reader.readJson<ManifestLayoutEntry[]>(`${base}/layouts.json`),
      this.reader.readJson<ManifestSchemaEntry[]>(`${base}/schemas.json`),
      this.reader.readJson<ManifestCommandEntry[]>(`${base}/commands.json`),
      this.reader.readJson<ManifestJobEntry[]>(`${base}/jobs.json`),
      this.reader.readJson<{ publishes?: ManifestEventEntry[]; consumes?: string[] }>(
        `${base}/events.json`
      ),
    ]);

    const presentation = (pluginJson as unknown as { presentation?: { routes?: ManifestRouteEntry[]; widgets?: ManifestWidgetEntry[]; navigation?: ManifestNavigationEntry[] } }).presentation;

    return {
      plugin: pluginJson,
      capabilities: capabilities ?? undefined,
      routes: routes ?? presentation?.routes ?? undefined,
      widgets: widgets ?? presentation?.widgets ?? undefined,
      navigation: navigation ?? presentation?.navigation ?? undefined,
      permissions: permissions ?? undefined,
      settings: settings ?? undefined,
      slots: slots ?? undefined,
      layouts: layouts ?? undefined,
      schemas: schemas ?? undefined,
      commands: commands ?? undefined,
      jobs: jobs ?? undefined,
      eventsPublished: events?.publishes ?? undefined,
      eventsConsumed: events?.consumes ?? undefined,
    };
  }
}
