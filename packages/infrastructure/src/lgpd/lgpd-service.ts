// ============================================================================
// LGPD Service — INF-006 (LGPD Base)
// ============================================================================
// Handles document publishing, evidenced acceptances (minimized technical
// evidence: a SHA-256 of the session inputs — no IP/User-Agent is stored),
// consent lifecycle (grant/withdraw) and the LGPD data-export (portability).
// ============================================================================

import { createHash } from 'node:crypto';

import type { LgpdRepository } from './lgpd-repository';
import type {
  AcceptanceRecord,
  ConsentRecord,
  LegalDocument,
  LegalDocumentVersion,
  LegalVersionPublish,
  PersonalDataExport,
} from './lgpd-types';

export class LgpdError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'document_not_found'
      | 'version_not_found'
      | 'consent_not_found'
      | 'acceptance_invalid',
  ) {
    super(message);
    this.name = 'LgpdError';
  }
}

export class LgpdService {
  constructor(
    private readonly repository: LgpdRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // -- Documents -------------------------------------------------------------

  async registerDocument(tenantId: string | undefined, code: string, title: string): Promise<LegalDocument> {
    return this.repository.ensureDocument({ tenantId, code, title });
  }

  async publishVersion(input: LegalVersionPublish): Promise<LegalDocumentVersion> {
    return this.repository.publishVersion(input);
  }

  // -- Acceptance ------------------------------------------------------------

  /**
   * Records an acceptance of a published document version. The `sessionEvidence`
   * input is minimized: never persisted raw — only its SHA-256 digest is stored
   * as the `session_evidence_id`.
   */
  async acceptDocument(tenantId: string, userId: string, code: string, version: string, rawEvidence?: Record<string, unknown>): Promise<AcceptanceRecord> {
    const versioned = await this.repository.getDocumentVersion(code, version);
    if (versioned === null) throw new LgpdError(`Version ${version} of '${code}' not found`, 'version_not_found');

    const evidenceId = this.hashEvidence([code, version, userId, this.now().toISOString()]);
    return this.repository.createAcceptance({
      tenantId,
      userId,
      documentVersionId: versioned.id,
      sessionEvidenceId: evidenceId,
      evidenceMetadata: rawEvidence ?? {},
    });
  }

  // -- Consent lifecycle -----------------------------------------------------

  async grantConsent(tenantId: string, userId: string, purpose: string): Promise<ConsentRecord> {
    return this.repository.createConsent({ tenantId, userId, purpose, granted: true });
  }

  async withdrawConsent(tenantId: string, userId: string, purpose: string, reason?: string): Promise<ConsentRecord> {
    const consents = await this.repository.listConsents(tenantId, userId);
    const latest = consents.find((c) => c.purpose === purpose);
    if (latest === undefined) {
      throw new LgpdError(`No consent found for purpose '${purpose}'`, 'consent_not_found');
    }
    if (latest.granted === false) return latest;
    const withdrawn = await this.repository.withdrawConsent(latest.id, reason);
    if (withdrawn === null) {
      throw new LgpdError(`Consent ${latest.id} not found`, 'consent_not_found');
    }
    return withdrawn;
  }

  async listConsents(tenantId: string, userId: string): Promise<ConsentRecord[]> {
    return this.repository.listConsents(tenantId, userId);
  }

  async listAcceptances(userId: string): Promise<AcceptanceRecord[]> {
    return this.repository.listAcceptances(userId);
  }

  // -- Export (LGPD — portabilidade) -----------------------------------------

  async exportPersonalData(tenantId: string, userId: string): Promise<PersonalDataExport> {
    return this.repository.exportPersonalData(tenantId, userId);
  }

  // -- Internals -------------------------------------------------------------

  /** SHA-256 hex digest of the minimized evidence inputs. */
  hashEvidence(inputs: string[]): string {
    const digest = createHash('sha256');
    for (const part of inputs.filter((value) => value.length > 0)) {
      digest.update(part);
    }
    return digest.digest('hex');
  }
}