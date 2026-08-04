export const COMPANY_TYPES = [
  'commercial',
  'masonic_store',
  'service_provider',
  'non_profit',
  'event_supplier',
  'educational_service'
] as const;

export type CompanyType = typeof COMPANY_TYPES[number];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  commercial: 'Negócio Geral',
  masonic_store: 'Loja de Artigos Maçônicos',
  service_provider: 'Serviço Profissional',
  non_profit: 'Organização sem Fins Lucrativos',
  event_supplier: 'Fornecedor de Eventos',
  educational_service: 'Serviço Educacional'
};

export const COMPANY_TYPE_ICONS: Record<CompanyType, string> = {
  commercial: 'building',
  masonic_store: 'gem',
  service_provider: 'briefcase',
  non_profit: 'heart',
  event_supplier: 'calendar',
  educational_service: 'graduation-cap'
};

export const PUBLICATION_STATUS = [
  'draft',
  'pending_approval',
  'published',
  'suspended',
  'archived'
] as const;

export type PublicationStatus = typeof PUBLICATION_STATUS[number];

export interface BusinessMember {
  id: string;
  tenant_id: string;
  business_id: string;
  user_id: string | null;
  invited_email: string | null;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  accepted_at: string | null;
  role: 'owner' | 'co_owner' | 'manager' | 'finance' | 'marketing' | 'support' | 'viewer';
  status: 'active' | 'invited' | 'suspended' | 'revoked';
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
  updated_at: string;
}

export const BUSINESS_MEMBER_ROLES = [
  'owner',
  'co_owner',
  'manager',
  'finance',
  'marketing',
  'support',
  'viewer'
] as const;

export type BusinessMemberRole = typeof BUSINESS_MEMBER_ROLES[number];

export const BUSINESS_MEMBER_STATUS = [
  'active',
  'invited',
  'suspended',
  'revoked'
] as const;

export type BusinessMemberStatus = typeof BUSINESS_MEMBER_STATUS[number];

export const BUSINESS_MEMBER_ROLE_PERMISSIONS: Record<BusinessMemberRole, string[]> = {
  owner: ['*'],
  co_owner: ['business:update', 'business:media:create', 'business:media:delete', 'business:locations:manage', 'business:contacts:manage', 'business:hours:manage', 'business:members:assign', 'business:members:revoke', 'subscription:create', 'subscription:upgrade', 'subscription:downgrade', 'subscription:cancel', 'invoices:view', 'payments:create', 'lead:view_received', 'lead:reply', 'lead:status:update', 'highlight:create', 'highlight:cancel', 'analytics:business:view', 'entitlement:usage:view'],
  manager: ['business:update', 'business:media:create', 'business:media:delete', 'business:locations:manage', 'business:contacts:manage', 'business:hours:manage', 'lead:view_received', 'lead:reply', 'lead:status:update', 'highlight:create', 'highlight:cancel', 'analytics:business:view', 'entitlement:usage:view'],
  finance: ['invoices:view', 'payments:create', 'subscription:create', 'subscription:upgrade', 'subscription:downgrade', 'subscription:cancel', 'analytics:business:view', 'entitlement:usage:view'],
  marketing: ['business:media:create', 'business:media:delete', 'business:contacts:manage', 'highlight:create', 'highlight:cancel', 'analytics:business:view', 'entitlement:usage:view'],
  support: ['lead:view_received', 'lead:reply', 'lead:status:update', 'analytics:business:view'],
  viewer: ['analytics:business:view', 'entitlement:usage:view']
};

export interface ListingHighlight {
  id: string;
  tenant_id: string;
  business_id: string;
  highlight_type: 'home_carousel' | 'category_top' | 'search_boost';
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
}

export const HIGHLIGHT_TYPES = [
  'home_carousel',
  'category_top',
  'search_boost'
] as const;

export type HighlightType = typeof HIGHLIGHT_TYPES[number];

export interface Sponsorship {
  id: string;
  tenant_id: string;
  business_id: string;
  sponsor_scope: 'portal_global' | 'category' | 'event_channel';
  scope_target_id: string | null;
  created_at: string;
}

export interface SponsorshipPeriod {
  id: string;
  sponsorship_id: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
}

export const SPONSORSHIP_SCOPES = [
  'portal_global',
  'category',
  'event_channel'
] as const;

export type SponsorshipScope = typeof SPONSORSHIP_SCOPES[number];