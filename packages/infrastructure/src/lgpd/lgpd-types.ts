// ============================================================================
// LGPD Runtime Types — INF-006
// ============================================================================
// Types for the LGPD base, aligned with migration
// 012_contracts_consent_lgpd.sql (legal_documents, legal_document_versions,
// acceptance_records, consent_records, consent_withdrawals).
//
// INVARIANT: Contains ZERO business logic.
// ============================================================================

export interface LegalDocument {
  id: string;
  tenantId?: string;
  code: string;
  title: string;
}

export interface LegalDocumentVersion {
  id: string;
  documentId: string;
  code: string;
  version: string;
  contentMarkdown: string;
  effectiveDate: string;
}

/** Evidência técnica minimizada: apenas o hash de sessão, sem IP/User-Agent. */
export interface AcceptanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  documentCode: string;
  documentVersionId: string;
  documentVersion: string;
  sessionEvidenceId: string;
  evidenceMetadata: Record<string, unknown>;
  acceptedAt: string;
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  userId: string;
  purpose: string;
  granted: boolean;
  withdrawnAt?: string;
  withdrawnReason?: string;
  createdAt: string;
}

// -- Repository inputs --------------------------------------------------------

export interface LegalDocumentUpsert {
  tenantId?: string;
  code: string;
  title: string;
}

export interface LegalVersionPublish {
  code: string;
  version: string;
  contentMarkdown: string;
  effectiveDate: string;
}

export interface AcceptanceCreate {
  tenantId: string;
  userId: string;
  documentVersionId: string;
  sessionEvidenceId: string;
  evidenceMetadata?: Record<string, unknown>;
}

export interface ConsentCreate {
  tenantId: string;
  userId: string;
  purpose: string;
  granted?: boolean;
}

// -- Export (LGPD — portabilidade) --------------------------------------------

export interface PersonalDataExport {
  userId: string;
  email: string;
  profile: Record<string, unknown>;
  consents: ConsentRecord[];
  acceptances: AcceptanceRecord[];
  tenantRoles: Array<{ tenantId: string; role: string }>;
  businessMemberships: Array<{ tenantId: string; businessId: string; role: string }>;
}