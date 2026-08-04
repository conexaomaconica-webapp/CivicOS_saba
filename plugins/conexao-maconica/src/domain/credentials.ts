export interface CredentialType {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  validity_days: number | null;
  requires_evidence: boolean;
  created_at: string;
}

export interface CredentialIssuance {
  id: string;
  tenant_id: string;
  credential_type_id: string;
  business_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'revoked';
  requested_by: string | null;
  requested_at: string;
  issued_at: string | null;
  expires_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialEvidence {
  id: string;
  issuance_id: string;
  evidence_type: 'document_pdf' | 'image' | 'declaration' | 'external_link';
  file_url: string;
  file_hash: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface CredentialHistory {
  id: string;
  issuance_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export const CREDENTIAL_STATUS = [
  'pending',
  'verified',
  'rejected',
  'expired',
  'revoked'
] as const;

export type CredentialStatus = typeof CREDENTIAL_STATUS[number];

export const EVIDENCE_TYPES = [
  'document_pdf',
  'image',
  'declaration',
  'external_link'
] as const;

export type EvidenceType = typeof EVIDENCE_TYPES[number];

export const DEFAULT_CREDENTIAL_TYPES = [
  {
    code: 'regularidade_maconica',
    name: 'Selo de Regularidade Maçônica',
    description: 'Certifica que a empresa pertence a um maçom em dia com suas obrigações',
    icon_url: '/icons/seal-regularidade.svg',
    validity_days: 365,
    requires_evidence: true
  },
  {
    code: 'fundador',
    name: 'Selo de Fundador',
    description: 'Empresa fundadora da plataforma na região',
    icon_url: '/icons/seal-fundador.svg',
    validity_days: null,
    requires_evidence: false
  },
  {
    code: 'empresa_maconica',
    name: 'Loja de Artigos Maçônicos',
    description: 'Estabelecimento especializado em artigos maçônicos',
    icon_url: '/icons/seal-masonic-store.svg',
    validity_days: 365,
    requires_evidence: true
  }
] as const;