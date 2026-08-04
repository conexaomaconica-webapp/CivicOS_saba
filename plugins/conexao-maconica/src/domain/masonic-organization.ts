export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  code_number: number | null;
  potency: string;
  rite: string | null;
  foundation_date: string | null;
  meeting_schedule: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUnit {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface OrganizationPerson {
  id: string;
  tenant_id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  cimb_code: string | null;
  masonic_degree: string | null;
  role_in_org: string;
  status: 'active' | 'licensed' | 'transferred' | 'inactive';
  created_at: string;
}

export interface OrganizationMembership {
  id: string;
  tenant_id: string;
  organization_id: string;
  person_id: string;
  role: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
}

export interface OrganizationRelationship {
  id: string;
  tenant_id: string;
  source_organization_id: string;
  target_organization_id: string;
  relationship_type: 'subordinate' | 'affiliated' | 'partner' | 'jurisdiction';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationEventLink {
  id: string;
  tenant_id: string;
  organization_id: string;
  event_id: string;
  link_type: 'organizer' | 'host' | 'participant' | 'sponsor';
  created_at: string;
}

export interface OrganizationBusinessPartnership {
  id: string;
  tenant_id: string;
  organization_id: string;
  business_id: string;
  partnership_type: 'conveniada' | 'patrocinadora' | 'fornecedora';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export const ORGANIZATION_ROLES = [
  'veneravel',
  'grande_secretario',
  'presidente',
  'tesoureiro',
  'secretario',
  'orador',
  'chanceler',
  'mestre_cerimonias',
  'membro'
] as const;

export type OrganizationRole = typeof ORGANIZATION_ROLES[number];

export const ORGANIZATION_PERSON_STATUS = [
  'active',
  'licensed',
  'transferred',
  'inactive'
] as const;

export type OrganizationPersonStatus = typeof ORGANIZATION_PERSON_STATUS[number];

export const ORGANIZATION_RELATIONSHIP_TYPES = [
  'subordinate',
  'affiliated',
  'partner',
  'jurisdiction'
] as const;

export type OrganizationRelationshipType = typeof ORGANIZATION_RELATIONSHIP_TYPES[number];

export const PARTNERSHIP_TYPES = [
  'conveniada',
  'patrocinadora',
  'fornecedora'
] as const;

export type PartnershipType = typeof PARTNERSHIP_TYPES[number];