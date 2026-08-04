// Founder Program Capability - Implementation details

export interface QualifyFounderData {
  business_id: string;
  founder_number: number;
}

export interface RevokeFounderData {
  status: 'suspended' | 'revoked';
  reason?: string;
}

export interface FounderBenefitData {
  business_id: string;
  benefit_type: 'discount_percentage' | 'fixed_discount' | 'free_months' | 'priority_support' | 'exclusive_badge' | 'api_access';
  value: number | string;
  description: string;
  valid_from: string;
  valid_until?: string;
}

export const FounderProgramAPI = {
  qualifyFounder: 'founder-program:qualifyFounder',
  revokeFounder: 'founder-program:revokeFounder',
  getFounderQualification: 'founder-program:getFounderQualification',
  listFounders: 'founder-program:listFounders',
  createFounderBenefit: 'founder-program:createFounderBenefit'
} as const;

export type FounderProgramMethod = typeof FounderProgramAPI[keyof typeof FounderProgramAPI];

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
    value: 'fundador',
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