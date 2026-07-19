// ============================================================================
// Navigation Contract — Core Kernel
// ============================================================================
// Defines the navigation structure that plugins contribute to.
// The shell (apps/web layout) reads these to build sidebar, breadcrumbs, etc.
// ============================================================================

// ---------------------------------------------------------------------------
// Navigation Item
// ---------------------------------------------------------------------------

export interface AppNavigationItem {
  /** Unique ID for this nav item. */
  readonly id: string;

  /** Display label. */
  readonly label: string;

  /** Icon identifier (e.g., Lucide icon name or custom SVG). */
  readonly icon?: string;

  /** Route path this item links to. */
  readonly path: string;

  /** Display order (lower = higher priority). */
  readonly order: number;

  /** Badge to display (e.g., unread count). */
  readonly badge?: string | number;

  /** Nested children for sub-navigation. */
  readonly children?: readonly AppNavigationItem[];

  /** Required permissions to see this item. */
  readonly permissions?: readonly string[];

  /** Whether this item should be shown in the sidebar. */
  readonly showInSidebar?: boolean;

  /** Whether this item should be shown in the top nav. */
  readonly showInTopNav?: boolean;

  /** Plugin ID that owns this item. */
  readonly pluginId?: string;
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface AppRouteDefinition {
  /** URL path (relative to app root). */
  readonly path: string;

  /**
   * Lazy-loaded page component.
   * Must return a module with a `default` React component export.
   */
  readonly component: () => Promise<{ default: React.ComponentType }>;

  /**
   * Optional lazy-loaded layout component.
   * Wraps the page component for this route.
   */
  readonly layout?: () => Promise<{ default: React.ComponentType }>;

  /** Required permissions to access this route. */
  readonly permissions?: readonly string[];

  /** Plugin ID that owns this route. */
  readonly pluginId?: string;

  /** Route metadata for SEO/analytics. */
  readonly meta?: RouteMeta;
}

export interface RouteMeta {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
}

// ---------------------------------------------------------------------------
// Navigation Provider
// ---------------------------------------------------------------------------

export interface NavigationProvider {
  /** Get all navigation items for the current user/tenant. */
  getItems(): AppNavigationItem[];

  /** Get all route definitions. */
  getRoutes(): AppRouteDefinition[];

  /** Get breadcrumb trail for a given path. */
  getBreadcrumbs(path: string): AppNavigationItem[];
}
