// ============================================================================
// Navigation Contracts — Core Engine
// ============================================================================

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly route: string;
  
  // Security and Filtering Options
  readonly permission?: string;
  readonly capability?: string;
  readonly role?: string;
  readonly policy?: string;
  
  // Placement in the shell
  readonly placement?: 'primary' | 'secondary' | 'mobile' | 'desktop';
  readonly order?: number;
  
  // Nested navigation items
  readonly children?: readonly NavigationItem[];
}
