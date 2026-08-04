export interface FounderQualification {
  id: string;
  tenant_id: string;
  business_id: string;
  founder_number: number;
  qualified_at: string;
  qualified_by: string | null;
  status: 'active' | 'suspended' | 'revoked';
  created_at: string;
}

export interface FounderBenefit {
  id: string;
  tenant_id: string;
  business_id: string;
  benefit_type: 'discount_percentage' | 'fixed_discount' | 'free_months' | 'priority_support' | 'exclusive_badge' | 'api_access';
  value: number | string;
  description: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export const FOUNDER_STATUS = [
  'active',
  'suspended',
  'revoked'
] as const;

export type FounderStatus = typeof FOUNDER_STATUS[number];

export const FOUNDER_BENEFIT_TYPES = [
  'discount_percentage',
  'fixed_discount',
  'free_months',
  'priority_support',
  'exclusive_badge',
  'api_access'
] as const;

export type FounderBenefitType = typeof FOUNDER_BENEFIT_TYPES[number];

export const DEFAULT_FOUNDER_BENEFITS = [
  {
    benefit_type: 'discount_percentage',
    value: 50,
    description: '50% de desconto vitalício no plano Ouro',
    valid_from: new Date().toISOString(),
    valid_until: null
  },
  {
    benefit_type: 'exclusive_badge',
    value: 'founder',
    description: 'Selo exclusivo de Fundador na listagem',
    valid_from: new Date().toISOString(),
    valid_until: null
  },
  {
    benefit_type: 'priority_support',
    value: 1,
    description: 'Suporte prioritário dedicado',
    valid_from: new Date().toISOString(),
    valid_until: null
  }
] as const;