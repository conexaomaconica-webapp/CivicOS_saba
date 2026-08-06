// ============================================================================
// Design Lab Types — Domain & Environment Contracts
// ============================================================================

export type ThemePreset =
  | 'conexao-maconica'
  | 'civicos-neutro'
  | 'community-blue-concept'
  | 'community-gold-concept';

export type ColorMode = 'light' | 'dark';

export type LayoutDensity = 'compact' | 'comfortable' | 'relaxed';

export type ViewportPreset =
  | 'desktop'
  | 'tablet'
  | 'mobile-iphone-se'
  | 'mobile-iphone-16'
  | 'mobile-pixel-9';

export interface DesignLabPreferences {
  theme: ThemePreset;
  colorMode: ColorMode;
  density: LayoutDensity;
  reducedMotion: boolean;
  activeViewport: ViewportPreset;
}

export interface DesignLabContextType {
  preferences: DesignLabPreferences;
  setTheme: (theme: ThemePreset) => void;
  setColorMode: (mode: ColorMode) => void;
  setDensity: (density: LayoutDensity) => void;
  setReducedMotion: (reduced: boolean) => void;
  setActiveViewport: (viewport: ViewportPreset) => void;
  resetPreferences: () => void;
}

// Mocks Interfaces
export interface MockTenant {
  id: string;
  name: string;
  slug: string;
  themePreset: ThemePreset;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  isOfficial: boolean;
  labelBadge?: string;
}

export interface MockBusiness {
  id: string;
  tenantId: string;
  name: string;
  tradeName: string;
  cnpj: string;
  slug: string;
  category: string;
  status: 'draft' | 'pending_review' | 'correction_requested' | 'approved' | 'rejected' | 'suspended';
  verificationBadge: boolean;
  badgeType?: 'fraternal_verified' | 'certified_partner' | 'founder';
  address: {
    city: string;
    state: string;
    neighborhood: string;
    isProtectedAddress?: boolean;
  };
  contact: {
    whatsapp: string;
    email: string;
    website?: string;
  };
  logoUrl?: string;
  coverUrl?: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
}

export interface MockPlan {
  id: string;
  name: string;
  code: string;
  priceAnnual: number;
  priceMonthlyEquivalent: number;
  features: string[];
  recommended?: boolean;
}

export interface MockContract {
  id: string;
  businessId: string;
  planName: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'annulled';
  signedAt?: string;
  signerName?: string;
  signerCpf?: string;
  documentHash?: string;
}

export interface MockPayment {
  id: string;
  invoiceId: string;
  businessName: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  method: 'pix' | 'credit_card' | 'bank_slip';
  paidAt?: string;
}

export interface MockModerationItem {
  id: string;
  businessId: string;
  businessName: string;
  cnpj: string;
  type: 'new_business' | 'credential_verification' | 'contest_defense';
  status: 'pending_review' | 'correction_requested' | 'approved' | 'rejected';
  submittedAt: string;
  submittedBy: string;
  evidenceUrl?: string;
  notes?: string;
}
