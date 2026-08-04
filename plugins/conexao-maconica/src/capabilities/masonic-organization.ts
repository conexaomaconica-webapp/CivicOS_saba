// Masonic Organization Capability - Implementation details
// This file documents the API surface for the capability

export interface OrganizationData {
  name: string;
  code_number?: number;
  potency: string;
  rite?: string;
  foundation_date?: string;
  meeting_schedule?: string;
  contact_email?: string;
}

export interface OrganizationUnitData {
  organization_id: string;
  name: string;
  type: string;
}

export interface OrganizationPersonData {
  organization_id: string;
  user_id?: string;
  full_name: string;
  cimb_code?: string;
  masonic_degree?: string;
  role_in_org: string;
  status: 'active' | 'licensed' | 'transferred' | 'inactive';
}

// API methods that would be implemented via the platform's service layer
export const MasonicOrganizationAPI = {
  // Organizations
  createOrganization: 'masonic-organization:createOrganization',
  updateOrganization: 'masonic-organization:updateOrganization',
  getOrganization: 'masonic-organization:getOrganization',
  listOrganizations: 'masonic-organization:listOrganizations',
  
  // Units
  createOrganizationUnit: 'masonic-organization:createOrganizationUnit',
  
  // People
  createOrganizationPerson: 'masonic-organization:createOrganizationPerson',
  getOrganizationPeople: 'masonic-organization:getOrganizationPeople',
  
  // Memberships (MVP 1B)
  createMembership: 'masonic-organization:createMembership',
  
  // Relationships (MVP 1B)
  createRelationship: 'masonic-organization:createRelationship',
  
  // Event Links (MVP 1B)
  linkEvent: 'masonic-organization:linkEvent',
  
  // Business Partnerships (MVP 1B)
  createPartnership: 'masonic-organization:createPartnership'
} as const;

export type MasonicOrganizationMethod = typeof MasonicOrganizationAPI[keyof typeof MasonicOrganizationAPI];