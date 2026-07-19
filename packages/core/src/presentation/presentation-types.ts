// ============================================================================
// Presentation Types — Presentation Platform (AC-7A)
// ============================================================================

export interface PresentationVersions {
  readonly registryVersion: number;
  readonly capabilityVersion: number;
  readonly licenseVersion: number;
  readonly permissionVersion: number;
  readonly policyVersion: number;
  readonly layoutVersion: number;
}

export interface PresentationContext {
  readonly tenantId: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly locale: string;
  readonly timezone?: string;
  readonly theme?: string;
  
  /**
   * The list of capabilities provided by the tenant's current license.
   * If a route/widget requires a capability not in this list, it is hidden.
   */
  readonly capabilities: readonly string[];
  
  /**
   * The list of permissions granted to the current user in this tenant context.
   */
  readonly permissions: readonly string[];
  
  /**
   * Optional pre-calculated policy decisions for quick filtering.
   */
  readonly policyDecision?: Record<string, boolean>;

  /**
   * Used to generate the deterministic cache key hash.
   */
  readonly versions: PresentationVersions;
}

export interface RouteDefinition {
  readonly id: string;
  readonly path: string;
  readonly componentId?: string;
  readonly layoutId?: string;
  readonly requireAuth: boolean;
  readonly requiredCapabilities?: string[];
  readonly requiredPermissions?: string[];
}

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly path: string; // The target route path
  readonly icon?: string;
  readonly parentId?: string;
  readonly priority: number;
  readonly requiredCapabilities?: string[];
  readonly requiredPermissions?: string[];
}

export interface WidgetDefinition {
  readonly id: string;
  readonly componentId: string;
  readonly slot: string;
  readonly priority: number;
  readonly weight?: number;
  readonly region?: string;
  readonly lazy?: boolean;
  readonly cacheable?: boolean;
  readonly requiredCapabilities?: string[];
  readonly requiredPermissions?: string[];
  readonly visibility?: Record<string, unknown>; // Custom rules
}

export interface SlotDefinition {
  readonly id: string;
  readonly description?: string;
}

export interface LayoutDefinition {
  readonly id: string;
  readonly componentId: string;
  readonly slots: string[]; // Which slots are available in this layout
}

export interface PresentationDiagnostic {
  readonly type: 'WARNING' | 'ERROR';
  readonly subsystem: string;
  readonly message: string;
  readonly recommendation: string;
}

/**
 * The official contract between the Kernel and any presentation renderer.
 * 
 * INVARIANTS:
 * - Immutable (Object.freeze)
 * - Deterministic (same context always produces same snapshot)
 * - Serializable (safe for JSON.stringify)
 * - Hashable (SHA256(JSON.stringify(snapshot)) is consistent)
 * - Sorted: All collections inside must be deterministically sorted.
 * 
 * @version 1.0.0 (Platform Freeze)
 * @stable
 */
export interface PresentationSnapshot {
  readonly version: string;
  readonly tenantId: string;
  readonly locale: string;
  readonly routes: readonly RouteDefinition[];
  readonly navigation: readonly NavigationItem[];
  readonly widgets: readonly WidgetDefinition[];
  readonly slots: readonly SlotDefinition[];
  readonly layouts: readonly LayoutDefinition[];
  readonly diagnostics: readonly PresentationDiagnostic[];
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
  readonly metadata: Record<string, unknown>;
}
