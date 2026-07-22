// ============================================================================
// Navigation Contracts — SDK
// ============================================================================

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly route?: string;
  readonly icon?: string;
  
  // Security and Filtering Options
  readonly permission?: string;
  readonly permissions?: readonly string[];
  readonly capability?: string;
  readonly role?: string;
  readonly policy?: string;
  
  // Placement in the shell
  readonly placement?: 'primary' | 'secondary' | 'mobile' | 'desktop';
  readonly order?: number;
  
  // Nested navigation items
  readonly children?: readonly NavigationItem[];
}

export interface NavigationGroupSnapshot {
  readonly id: string;
  readonly label?: string;
  readonly items: readonly NavigationItem[];
}

export interface NavigationSnapshot {
  readonly groups: readonly NavigationGroupSnapshot[];
}
