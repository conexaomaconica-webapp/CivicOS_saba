// ============================================================================
// Kernel — CivicOS Boot Orchestrator
// ============================================================================
// Implements the 10-phase boot sequence defined in 17_BOOT_RUNTIME_SPEC.md.
// The Kernel is the single entry point for starting the CivicOS runtime.
//
// INVARIANT: This module contains ZERO business logic.
// It only orchestrates infrastructure components in a deterministic order.
// ============================================================================

import { ManifestLoader } from './manifest-loader';
import type { ManifestReader, FullLoadedManifest } from './manifest-loader';
import { PluginValidator } from './plugin-validator';
import { PluginLifecycleManager } from './plugin-lifecycle';
import { RegistryManager } from './registry-manager';
import { EventBus } from './event-bus';
import { Container } from './di/container';
import { CORE_TOKENS } from './di/tokens';
import { CapabilityGraph, CapabilityValidationReport } from './capabilities/capability-graph';
import { PluginGraph } from './plugins/plugin-graph';
import { PermissionEngine } from './permissions/permission-engine';

import { DiagnosticsContributorRegistry } from './diagnostics/diagnostics-contributor';
import { HealthContributorRegistry, HealthAggregator } from './diagnostics/health-contributor';
import { NavigationGraph } from './presentation/navigation-graph';

import { DiagnosticsEngine } from './diagnostics/diagnostics-engine';
import { HealthStatus, type DiagnosticsSnapshot } from './diagnostics/diagnostics-types';
import { PresentationQueryRuntime } from './presentation/query/presentation-query-runtime';
import { PresentationSnapshotBuilder } from './presentation/query/presentation-snapshot-builder';
import { MemoryPresentationCache } from './presentation/query/presentation-cache';
import { RouteResolver } from './presentation/query/route-resolver';
import { NavigationResolver } from './presentation/query/navigation-resolver';
import { LayoutResolver } from './presentation/query/layout-resolver';
import { WidgetResolver } from './presentation/query/widget-resolver';
import type { PolicyEngine, WorkflowRuntime, ExecutionRuntime, CapabilityPlatform } from './facades';

// ---------------------------------------------------------------------------
// Boot Logger Interface
// ---------------------------------------------------------------------------

export interface BootLogger {
  info(phase: string, message: string, meta?: Record<string, unknown>): void;
  warn(phase: string, message: string, meta?: Record<string, unknown>): void;
  error(phase: string, message: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: BootLogger = {
  info: (phase, msg, meta) => console.log(`[BOOT:${phase}] ${msg}`, meta ?? ''),
  warn: (phase, msg, meta) => console.warn(`[BOOT:${phase}] ${msg}`, meta ?? ''),
  error: (phase, msg, meta) => console.error(`[BOOT:${phase}] ${msg}`, meta ?? ''),
};

// ---------------------------------------------------------------------------
// Boot Options
// ---------------------------------------------------------------------------

export interface KernelBootOptions {
  /** Path to the plugins directory */
  readonly pluginsDir: string;
  /** Manifest reader implementation */
  readonly reader: ManifestReader;
  /** Current Core version (for manifest compatibility checks) */
  readonly coreVersion: string;
  /** Optional logger */
  readonly logger?: BootLogger;
  /** Optional pre-configured EventBus */
  readonly eventBus?: EventBus;
  /** Optional pre-configured DI Container */
  readonly container?: Container;
}

// ---------------------------------------------------------------------------
// Boot Result
// ---------------------------------------------------------------------------

export interface BootReport {
  readonly bootDurationMs: number;
  readonly pluginsDiscovered: number;
  readonly pluginsLoaded: number;
  readonly pluginsFailed: number;
  readonly routes: number;
  readonly widgets: number;
  readonly capabilities: number;
  readonly warnings: readonly string[];
}

export interface ArchitectureHealthReport {
  readonly constitutionalVersion: string;
  readonly kernelVersion: string;
  readonly registries: number;
  readonly plugins: number;
  readonly capabilities: number;
  readonly warnings: readonly string[];
  readonly violations: readonly string[];
  readonly capabilityGraph: CapabilityValidationReport;
  readonly bootDurationMs: number;
  readonly complianceScore: number;
}

export interface CivicOSInstance {
  presentation(): PresentationQueryRuntime;
  health(): Promise<HealthStatus>;
  diagnostics(): Promise<DiagnosticsSnapshot>;
  
  execution(): ExecutionRuntime;
  policy(): PolicyEngine;
  workflow(): WorkflowRuntime;
  capabilities(): CapabilityPlatform;
  events(): EventBus;

  readonly _internal: {
    readonly container: Container;
    readonly loadedManifests: readonly FullLoadedManifest[];
    readonly rejectedPlugins: readonly string[];
    readonly activePlugins: readonly string[];
    readonly report: BootReport;
    readonly health: ArchitectureHealthReport;
  };
}

// ---------------------------------------------------------------------------
// Kernel
// ---------------------------------------------------------------------------

export class Kernel {
  private static isBooted = false;
  private static cachedResult: CivicOSInstance | null = null;

  private static diagnosticsEngine?: DiagnosticsEngine;
  private static healthAggregator?: HealthAggregator;
  public static lastHealthReport?: ArchitectureHealthReport;

  /**
   * Executes the 10-phase CivicOS boot sequence.
   * Returns the CivicOS operating system instance.
   */
  static async boot(options: KernelBootOptions): Promise<CivicOSInstance> {
    if (this.isBooted && this.cachedResult) {
      return this.cachedResult;
    }
    
    this.isBooted = true;
    const startTime = Date.now();
    const logger = options.logger ?? defaultLogger;
    const container = options.container ?? new Container();
    
    // Fallback instantiation if not provided in container
    const eventBus = options.eventBus ?? (() => {
      try { return container.resolve(CORE_TOKENS.EventBus); } catch { return new EventBus(); }
    })();

    // Init Diagnostics
    const diagRegistry = new DiagnosticsContributorRegistry();
    const healthRegistry = new HealthContributorRegistry();
    this.healthAggregator = new HealthAggregator(healthRegistry);
    this.diagnosticsEngine = new DiagnosticsEngine(options.coreVersion, diagRegistry, this.healthAggregator);
    this.diagnosticsEngine.recordEvent('Kernel Boot Started');

    // Ensure core services are registered
    try { container.resolve(CORE_TOKENS.EventBus); } catch { container.register(CORE_TOKENS.EventBus, eventBus); }
    
    const rejectedPlugins: string[] = [];
    const warnings: string[] = [];
    const violations: string[] = [];

    try {
      // ── Phase 1: Kernel Init ──────────────────────────────────────────
      logger.info('INIT', 'Kernel boot starting', { coreVersion: options.coreVersion });
      eventBus.emit('kernel.boot.started', { coreVersion: options.coreVersion, timestamp: startTime });

      // ── Phase 2: Plugin Discovery ─────────────────────────────────────
      logger.info('DISCOVERY', 'Scanning plugins directory', { dir: options.pluginsDir });
      const loader = new ManifestLoader(options.reader);
      const allManifests = await loader.discoverAndLoad(options.pluginsDir);
      logger.info('DISCOVERY', `Discovered ${allManifests.length} plugin(s)`);
      
      for (const m of allManifests) {
        eventBus.emit('plugin.discovered', { pluginId: m.plugin.id, version: m.plugin.version });
      }

      // ── Phase 3: Manifest Loading (already done by discoverAndLoad) ──
      logger.info('MANIFEST', 'Manifests loaded and parsed');

      // ── Phase 4: Validation ───────────────────────────────────────────
      logger.info('VALIDATION', 'Validating plugin manifests');
      const allProvides = new Set<string>();
      for (const m of allManifests) {
        if (m.capabilities?.provides) {
          for (const cap of m.capabilities.provides) {
            const id = typeof cap === 'string' ? cap : cap.id;
            allProvides.add(id);
          }
        }
      }

      const validManifests: FullLoadedManifest[] = [];
      for (const manifest of allManifests) {
        const result = PluginValidator.validate(manifest, options.coreVersion, allProvides);
        if (result.isValid) {
          validManifests.push(manifest);
          eventBus.emit('plugin.validated', { pluginId: manifest.plugin.id, isValid: true });
        } else {
          rejectedPlugins.push(manifest.plugin.id);
          logger.warn('VALIDATION', `Plugin "${manifest.plugin.id}" rejected`, {
            errors: result.errors,
          });
          eventBus.emit('plugin.validation.failed', { pluginId: manifest.plugin.id, errors: result.errors });
        }
      }
      logger.info('VALIDATION', `${validManifests.length} valid, ${rejectedPlugins.length} rejected`);

      // ── Phase 5: Dependency Resolution ────────────────────────────────
      logger.info('DEPS', 'Resolving plugin dependencies');
      const bootOrderResult = PluginGraph.resolveBootOrder(
        validManifests.map((m) => m.plugin)
      );
      if (bootOrderResult.cycles.length > 0) {
        logger.error('DEPS', 'Circular dependencies detected', { cycles: bootOrderResult.cycles });
        throw new Error(`Boot aborted: ${bootOrderResult.cycles.join('; ')}`);
      }
      if (bootOrderResult.missingDependencies.length > 0) {
        logger.error('DEPS', 'Missing dependencies detected', { missing: bootOrderResult.missingDependencies });
        throw new Error(`Boot aborted: ${bootOrderResult.missingDependencies.join('; ')}`);
      }
      
      // Reorder validManifests to match the topological sort boot order
      validManifests.sort((a, b) => {
        return bootOrderResult.sortedIds.indexOf(a.plugin.id) - bootOrderResult.sortedIds.indexOf(b.plugin.id);
      });

      // Check duplicate routes
      const allRoutes = validManifests.flatMap((m) =>
        (m.routes ?? []).map((r) => ({ pluginId: m.plugin.id, path: r.path }))
      );
      const routeDupes = PluginValidator.checkDuplicateRoutes(allRoutes);
      if (routeDupes.length > 0) {
        logger.error('DEPS', 'Duplicate routes detected', { duplicates: routeDupes });
        throw new Error(`Boot aborted: ${routeDupes.join('; ')}`);
      }

      // Check duplicate widgets
      const allWidgets = validManifests.flatMap((m) =>
        (m.widgets ?? []).map((w) => ({ pluginId: m.plugin.id, id: w.id, slot: w.slot }))
      );
      const widgetDupes = PluginValidator.checkDuplicateWidgets(allWidgets);
      if (widgetDupes.length > 0) {
        logger.error('DEPS', 'Duplicate widgets detected', { duplicates: widgetDupes });
        throw new Error(`Boot aborted: ${widgetDupes.join('; ')}`);
      }

      // ── Phase 6: Lifecycle Transitions ────────────────────────────────
      logger.info('LIFECYCLE', 'Transitioning plugins to ACTIVE state');
      const lifecycle = new PluginLifecycleManager();
      
      lifecycle.onTransition((pluginId, from, to, reason) => {
        eventBus.emit('plugin.lifecycle.changed', { pluginId, from, to, reason });
      });

      // Initialize PermissionEngine
      const permissionEngine = new PermissionEngine();
      permissionEngine.initialize(validManifests.map(m => m.plugin));

      // In a real execution, we would dynamically import the plugin's entry point here.
      // e.g. const module = await import(`plugins/${manifest.plugin.id}/dist/index.js`);
      // const hooks = module.hooks as PluginLifecycleHooks;

      for (const manifest of validManifests) {
        lifecycle.discover(manifest.plugin.id);
        
        // At this phase, we could build the context if we needed to execute hooks.
        // const pluginEventBus = new PluginEventBus(eventBus);
        // const serviceResolver = new ServiceResolver(manifest.plugin.id, container, permissionEngine);
        // ... build context ...
        
        lifecycle.advanceToActive(manifest.plugin.id);
      }
      logger.info('LIFECYCLE', `${validManifests.length} plugin(s) activated`);

      // ── Phase 7: Registry Population ──────────────────────────────────
      logger.info('REGISTRIES', 'Populating registries from manifests');
      
      let registries: RegistryManager;
      try {
        registries = container.resolve(CORE_TOKENS.RegistryManager);
      } catch {
        registries = new RegistryManager();
        container.register(CORE_TOKENS.RegistryManager, registries);
      }

      registries.populateFromManifests(validManifests);
      
      eventBus.emit('registry.updated', { 
        routes: registries.presentationRoutes.getAll().length,
        widgets: registries.presentationWidgets.getAll().length,
        capabilities: registries.capabilities.getAllProvided().size,
        navigation: registries.presentationNavigation.getAll().length,
      });

      // FREEZE registries after boot population
      registries.freeze();
      eventBus.emit('registry.frozen', { timestamp: Date.now() });

      logger.info('REGISTRIES', 'All registries populated and frozen', {
        routes: registries.presentationRoutes.getAll().length,
        widgets: registries.presentationWidgets.getAll().length,
        capabilities: registries.capabilities.getAllProvided().size,
        navigation: registries.presentationNavigation.getAll().length,
      });

      // ── Phase 7.5: Navigation Graph Validation ────────────────────────
      logger.info('PRESENTATION', 'Validating Presentation Integrity (Navigation Graph)');
      const navGraph = new NavigationGraph(
        registries.presentationRoutes,
        registries.presentationNavigation,
        registries.presentationWidgets,
        registries.presentationSlots,
        registries.presentationLayouts,
        this.diagnosticsEngine!
      );
      
      // Validates structural (throws and aborts) and referential (drops and warns)
      navGraph.validate();

      // ── Phase 8: Capability Resolution & Graph ───────────────────────
      logger.info('CAPABILITIES', 'Cross-validating capability requirements');
      const capabilitySnapshot = registries.capabilities.snapshot();
      const capGraphReport = CapabilityGraph.analyze(capabilitySnapshot);

      if (!capGraphReport.isValid) {
        for (const err of capGraphReport.errors) {
          logger.warn('CAPABILITIES', err);
          violations.push(err);
        }
      }
      for (const warn of capGraphReport.warnings) {
        warnings.push(warn);
      }

      // ── Phase 9: License Validation (Dynamic) ─────────────────────────
      // Licensing is resolved per-tenant at runtime by LicensingEngine + CapabilityResolver.
      logger.info('LICENSING', 'Licensing resolution is handled dynamically per-tenant at runtime');

      // ── Phase 10: Application Ready ───────────────────────────────────
      const activePlugins = lifecycle.listByState('active');
      const bootDurationMs = Date.now() - startTime;

      // Register lifecycle in DI
      try { container.resolve(CORE_TOKENS.PluginLifecycleManager); } 
      catch { container.register(CORE_TOKENS.PluginLifecycleManager, lifecycle); }

      // Calculate Compliance Score
      let complianceScore = 100;
      if (violations.length > 0) complianceScore -= 50;
      if (rejectedPlugins.length > 0) complianceScore -= (rejectedPlugins.length * 5);
      if (warnings.length > 0) complianceScore -= (warnings.length * 2);
      complianceScore = Math.max(0, complianceScore);

      const healthReport: ArchitectureHealthReport = {
        constitutionalVersion: "1.0", // from specs
        kernelVersion: options.coreVersion,
        registries: 6, // 6 core registries
        plugins: validManifests.length,
        capabilities: registries.capabilities.getAllProvided().size,
        warnings,
        violations,
        capabilityGraph: capGraphReport,
        bootDurationMs,
        complianceScore,
      };
      
      (Kernel as any).lastHealthReport = healthReport;

      logger.info('READY', `CivicOS boot complete in ${bootDurationMs}ms. Score: ${complianceScore}/100`);

      eventBus.emit('kernel.boot.completed', { durationMs: bootDurationMs, activePlugins: activePlugins.length });

      const report: BootReport = {
        bootDurationMs,
        pluginsDiscovered: allManifests.length,
        pluginsLoaded: validManifests.length,
        pluginsFailed: rejectedPlugins.length,
        routes: registries.presentationRoutes.getAll().length,
        widgets: registries.presentationWidgets.getAll().length,
        capabilities: registries.capabilities.getAllProvided().size,
        warnings,
      };

      // Construct the Presentation Facade
      const routeResolver = new RouteResolver(registries.presentationRoutes);
      const navigationResolver = new NavigationResolver(registries.presentationNavigation);
      const layoutResolver = new LayoutResolver(registries.presentationLayouts);
      const widgetResolver = new WidgetResolver(registries.presentationWidgets);
      const builder = new PresentationSnapshotBuilder(
        routeResolver,
        navigationResolver,
        layoutResolver,
        widgetResolver,
        registries.presentationSlots,
        options.coreVersion
      );
      const cache = new MemoryPresentationCache();
      const presentationRuntime = new PresentationQueryRuntime(builder, cache);

      const result: CivicOSInstance = {
        presentation: () => presentationRuntime,
        health: async () => this.healthAggregator!.aggregate(),
        diagnostics: async () => this.diagnosticsEngine!.generateSnapshot(),
        execution: () => {
          throw new Error('Not implemented: execution facade requires persistence layer bindings.');
        },
        policy: () => {
          throw new Error('Not implemented: policy facade requires wiring.');
        },
        workflow: () => {
          throw new Error('Not implemented: workflow facade requires wiring.');
        },
        capabilities: () => {
           throw new Error('Not implemented: capabilities facade requires wiring.');
        },
        events: () => eventBus,
        
        _internal: {
          container,
          loadedManifests: validManifests,
          rejectedPlugins,
          activePlugins,
          report,
          health: healthReport,
        }
      };
      
      this.cachedResult = result;
      return result;
    } catch (error) {
      this.isBooted = false; // Allow retry on failure
      const message = error instanceof Error ? error.message : String(error);
      this.diagnosticsEngine?.recordEvent(`Boot failed: ${message}`);
      eventBus.emit('kernel.boot.failed', { error: message, timestamp: Date.now() });
      throw error;
    }
  }

  // We removed the static diagnostics methods because they are now on CivicOSInstance.
  // We removed resolvePresentation because it is now on civicOS.presentation().snapshot(context).

  /**
   * Resets the kernel state. Only intended for test environments.
   */
  static resetForTesting(): void {
    this.isBooted = false;
    this.cachedResult = null;
    this.diagnosticsEngine = undefined;
    this.healthAggregator = undefined;
  }
}
