// Masonic Verification Capability - Implementation details

export interface CredentialTypeData {
  code: string;
  name: string;
  description?: string;
  icon_url?: string;
  validity_days?: number;
  requires_evidence: boolean;
}

export interface RequestCredentialData {
  credential_type_id: string;
  business_id?: string;
  organization_id?: string;
}

export interface VerifyCredentialData {
  status: 'verified' | 'rejected';
  verification_notes?: string;
}

export interface UploadEvidenceData {
  issuance_id: string;
  evidence_type: 'document_pdf' | 'image' | 'declaration' | 'external_link';
  file_url: string;
  file_hash?: string;
}

export const MasonicVerificationAPI = {
  // Credential Types
  createCredentialType: 'masonic-verification:createCredentialType',
  getCredentialTypes: 'masonic-verification:getCredentialTypes',
  
  // Issuances
  requestCredential: 'masonic-verification:requestCredential',
  verifyCredential: 'masonic-verification:verifyCredential',
  getCredentialIssuances: 'masonic-verification:getCredentialIssuances',
  
  // Evidence
  uploadEvidence: 'masonic-verification:uploadEvidence',
  getEvidence: 'masonic-verification:getEvidence',
  
  // History
  getCredentialHistory: 'masonic-verification:getCredentialHistory'
} as const;

export type MasonicVerificationMethod = typeof MasonicVerificationAPI[keyof typeof MasonicVerificationAPI];

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