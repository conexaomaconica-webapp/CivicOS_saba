// ============================================================================
// LGPD Repository — INF-006
// ============================================================================
// Persistence contract and PostgreSQL implementation for the LGPD base,
// aligned with migration 012_contracts_consent_lgpd.sql.
// Queries run through the service-role SQL path (RLS bypassed by service_role).
// ============================================================================

import type { DatabaseClient } from '../database/database-client';
import type {
  AcceptanceCreate,
  AcceptanceRecord,
  ConsentCreate,
  ConsentRecord,
  LegalDocument,
  LegalDocumentUpsert,
  LegalDocumentVersion,
  LegalVersionPublish,
  PersonalDataExport,
} from './lgpd-types';

export interface LgpdRepository {
  // -- Legal documents -------------------------------------------------------
  ensureDocument(input: LegalDocumentUpsert): Promise<LegalDocument>;
  publishVersion(input: LegalVersionPublish): Promise<LegalDocumentVersion>;
  getDocumentVersion(code: string, version: string): Promise<LegalDocumentVersion | null>;

  // -- Acceptances -----------------------------------------------------------
  createAcceptance(input: AcceptanceCreate): Promise<AcceptanceRecord>;

  // -- Consents --------------------------------------------------------------
  createConsent(input: ConsentCreate): Promise<ConsentRecord>;
  withdrawConsent(consentId: string, reason?: string): Promise<ConsentRecord | null>;
  listConsents(tenantId: string, userId: string): Promise<ConsentRecord[]>;
  listAcceptances(userId: string): Promise<AcceptanceRecord[]>;

  // -- Export (LGPD — portabilidade) ------------------------------------------
  exportPersonalData(tenantId: string, userId: string): Promise<PersonalDataExport>;
}

// ---------------------------------------------------------------------------
// PostgreSQL implementation
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string;
  tenant_id: string | null;
  code: string;
  title: string;
}

interface VersionRow {
  id: string;
  document_id: string;
  code: string;
  version: string;
  content_markdown: string;
  effective_date: string;
}

interface AcceptanceRow {
  id: string;
  tenant_id: string;
  user_id: string;
  document_version_id: string;
  session_evidence_id: string;
  evidence_metadata: Record<string, unknown>;
  accepted_at: string;
  document_code: string;
  document_version: string;
}

interface ConsentJoinRow {
  id: string;
  tenant_id: string;
  user_id: string;
  purpose: string;
  granted: boolean;
  created_at: string;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
}

function toConsent(row: ConsentJoinRow): ConsentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    purpose: row.purpose,
    granted: row.granted,
    withdrawnAt: row.withdrawn_at ?? undefined,
    withdrawnReason: row.withdrawn_reason ?? undefined,
    createdAt: row.created_at,
  };
}

export class PostgresLgpdRepository implements LgpdRepository {
  constructor(private readonly db: DatabaseClient) {}

  // -- Legal documents -------------------------------------------------------

  async ensureDocument(input: LegalDocumentUpsert): Promise<LegalDocument> {
    const rows = await this.db.query<DocumentRow>(
      `INSERT INTO public.legal_documents (tenant_id, code, title)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *;`,
      [input.tenantId ?? null, input.code, input.title],
    );
    const row = rows[0];
    if (row === undefined) {
      return this.getDocumentByCode(input.code, input.tenantId ?? null);
    }
    return { id: row.id, tenantId: row.tenant_id ?? undefined, code: row.code, title: row.title };
  }

  async publishVersion(input: LegalVersionPublish): Promise<LegalDocumentVersion> {
    const rows = await this.db.query<VersionRow>(
      `INSERT INTO public.legal_document_versions
        (document_id, version, content_markdown, effective_date)
       SELECT id, $2, $3, $4 FROM public.legal_documents WHERE code = $1
       ON CONFLICT (document_id, version)
       DO UPDATE SET content_markdown = EXCLUDED.content_markdown, effective_date = EXCLUDED.effective_date
       RETURNING *;`,
      [input.code, input.version, input.contentMarkdown, input.effectiveDate],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error(`LGPD: document '${input.code}' not found`);
    }
    return {
      id: row.id,
      documentId: row.document_id,
      code: input.code,
      version: row.version,
      contentMarkdown: row.content_markdown,
      effectiveDate: row.effective_date,
    };
  }

  async getDocumentVersion(code: string, version: string): Promise<LegalDocumentVersion | null> {
    const rows = await this.db.query<VersionRow>(
      `SELECT v.id, v.document_id, v.version, v.content_markdown, v.effective_date, d.code
       FROM public.legal_document_versions v
       JOIN public.legal_documents d ON d.id = v.document_id
       WHERE d.code = $1 AND v.version = $2
       LIMIT 1;`,
      [code, version],
    );
    const row = rows[0];
    if (row === undefined) return null;
    return {
      id: row.id,
      documentId: row.document_id,
      code: row.code,
      version: row.version,
      contentMarkdown: row.content_markdown,
      effectiveDate: row.effective_date,
    };
  }

  // -- Acceptances -----------------------------------------------------------

  async createAcceptance(input: AcceptanceCreate): Promise<AcceptanceRecord> {
    const rows = await this.db.query<AcceptanceRow>(
      `INSERT INTO public.acceptance_records
        (tenant_id, user_id, document_version_id, session_evidence_id, evidence_metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        input.tenantId,
        input.userId,
        input.documentVersionId,
        input.sessionEvidenceId,
        input.evidenceMetadata ?? {},
      ],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('LGPD: createAcceptance returned no row');
    return this.toAcceptance(row);
  }

  // -- Consents --------------------------------------------------------------

  async createConsent(input: ConsentCreate): Promise<ConsentRecord> {
    const rows = await this.db.query<ConsentJoinRow>(
      `INSERT INTO public.consent_records (tenant_id, user_id, purpose, granted)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, user_id, purpose, granted,
                 created_at, NULL::timestamptz AS withdrawn_at, NULL::text AS withdrawn_reason;`,
      [input.tenantId, input.userId, input.purpose, input.granted ?? true],
    );
    const row = rows[0];
    if (row === undefined) throw new Error('LGPD: createConsent returned no row');
    return toConsent(row);
  }

  async withdrawConsent(consentId: string, reason?: string): Promise<ConsentRecord | null> {
    await this.db.query<ConsentJoinRow>(
      `UPDATE public.consent_records
       SET granted = false
       WHERE id = $1 AND granted = true;`,
      [consentId],
    );

    await this.db.query<ConsentJoinRow>(
      `INSERT INTO public.consent_withdrawals (consent_id, reason)
       SELECT id, $1 FROM public.consent_records WHERE id = $2 AND granted = false
       ON CONFLICT DO NOTHING;`,
      [reason ?? null, consentId],
    );

    const updated = await this.db.query<ConsentJoinRow>(
      `SELECT c.id, c.tenant_id, c.user_id, c.purpose, c.granted, c.created_at,
              w.withdrawn_at, w.reason AS withdrawn_reason
       FROM public.consent_records c
       LEFT JOIN public.consent_withdrawals w ON w.consent_id = c.id
       WHERE c.id = $1
       LIMIT 1;`,
      [consentId],
    );
    const row = updated[0];
    return row === undefined ? null : toConsent(row);
  }

  async listConsents(tenantId: string, userId: string): Promise<ConsentRecord[]> {
    const rows = await this.db.query<ConsentJoinRow>(
      `SELECT c.id, c.tenant_id, c.user_id, c.purpose, c.granted, c.created_at,
              w.withdrawn_at, w.reason AS withdrawn_reason
       FROM public.consent_records c
       LEFT JOIN public.consent_withdrawals w ON w.consent_id = c.id
       WHERE c.tenant_id = $1 AND c.user_id = $2
       ORDER BY c.created_at DESC;`,
      [tenantId, userId],
    );
    return rows.map((row) => toConsent(row));
  }

  async listAcceptances(userId: string): Promise<AcceptanceRecord[]> {
    const rows = await this.db.query<AcceptanceRow>(
      `SELECT a.id, a.tenant_id, a.user_id, a.document_version_id,
              a.session_evidence_id, a.evidence_metadata, a.accepted_at,
              d.code AS document_code, v.version AS document_version
       FROM public.acceptance_records a
       JOIN public.legal_document_versions v ON v.id = a.document_version_id
       JOIN public.legal_documents d ON d.id = v.document_id
       WHERE a.user_id = $1
       ORDER BY a.accepted_at DESC;`,
      [userId],
    );
    return rows.map((row) => this.toAcceptance(row));
  }

  // -- Export (LGPD) ---------------------------------------------------------

  async exportPersonalData(tenantId: string, userId: string): Promise<PersonalDataExport> {
    const [profileRows, consentRows, acceptanceRows, roleRows, memberRows] = await Promise.all([
      this.db.query<{ email: string; name: string | null; role: string | null; tenant_id: string | null }>(
        `SELECT u.email, p.name, p.role, p.tenant_id
         FROM auth.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE u.id = $1
         LIMIT 1;`,
        [userId],
      ),
      this.listConsents(tenantId, userId),
      this.listAcceptances(userId),
      this.db.query<{ tenant_id: string; role_code: string }>(
        `SELECT ur.tenant_id, r.code AS role_code
         FROM public.user_roles ur
         JOIN public.roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND ur.status = 'active'
         ORDER BY ur.tenant_id;`,
        [userId],
      ),
      this.db.query<{ tenant_id: string; business_id: string; role: string }>(
        `SELECT tenant_id, business_id, role
         FROM public.business_members
         WHERE user_id = $1 AND status = 'active'
         ORDER BY tenant_id, business_id;`,
        [userId],
      ),
    ]);

    const profile = profileRows[0] ?? { email: null, name: null, role: null, tenant_id: null };

    return {
      userId,
      email: profile.email ?? '',
      profile,
      consents: consentRows,
      acceptances: acceptanceRows,
      tenantRoles: roleRows.map((row) => ({ tenantId: row.tenant_id, role: row.role_code })),
      businessMemberships: memberRows.map((row) => ({
        tenantId: row.tenant_id,
        businessId: row.business_id,
        role: row.role,
      })),
    };
  }

  // -- Mappers ---------------------------------------------------------------

  private toAcceptance(row: AcceptanceRow): AcceptanceRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      documentCode: row.document_code,
      documentVersionId: row.document_version_id,
      documentVersion: row.document_version,
      sessionEvidenceId: row.session_evidence_id,
      evidenceMetadata: row.evidence_metadata,
      acceptedAt: row.accepted_at,
    };
  }

  private async getDocumentByCode(code: string, tenantId: string | null): Promise<LegalDocument> {
    const rows = await this.db.query<DocumentRow>(
      `SELECT * FROM public.legal_documents
       WHERE code = $1 AND (tenant_id IS NULL OR tenant_id = $2)
       ORDER BY tenant_id IS NULL
       LIMIT 1;`,
      [code, tenantId],
    );
    const row = rows[0];
    if (row === undefined) throw new Error(`LGPD: document '${code}' not found`);
    return { id: row.id, tenantId: row.tenant_id ?? undefined, code: row.code, title: row.title };
  }
}