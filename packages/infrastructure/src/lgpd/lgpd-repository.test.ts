import { describe, it, expect } from 'vitest';

import { PostgresLgpdRepository } from './lgpd-repository';
import type { DatabaseClient } from '../database/database-client';

interface RowsController {
  rows: unknown[];
  queries: string[];
}

function scripted(): RowsController & DatabaseClient {
  const controller: RowsController = { rows: [], queries: [] };
  const client: DatabaseClient = {
    query<T>(sql: string, _params?: unknown[]): Promise<T[]> {
      controller.queries.push(sql);
      void _params;
      return Promise.resolve(controller.rows as T[]);
    },
    insert<T>(_table: string, data: Partial<T>): Promise<T> {
      return Promise.resolve(data as T);
    },
    update<T>(_table: string, _id: string, data: Partial<T>): Promise<T> {
      return Promise.resolve(data as T);
    },
    delete(_table: string, _id: string): Promise<boolean> {
      void _table;
      void _id;
      return Promise.resolve(true);
    },
    transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
      return callback(client);
    },
  };
  return Object.assign(controller, client);
}

const ACCEPTANCE_ROW = {
  id: 'acc_1',
  tenant_id: 'tnt_1',
  user_id: 'user_1',
  document_version_id: 'ver_1',
  session_evidence_id: 'a1b2c3',
  evidence_metadata: {},
  accepted_at: '2026-08-11T12:00:00.000Z',
  document_code: 'terms',
  document_version: '2026.1',
};

describe('PostgresLgpdRepository', () => {
  it('ensures a document and inserts it when new', async () => {
    const db = scripted();
    db.rows = [
      { id: 'doc_1', tenant_id: null, code: 'terms', title: 'Termos de Uso' },
    ];
    const repo = new PostgresLgpdRepository(db);

    const doc = await repo.ensureDocument({ code: 'terms', title: 'Termos de Uso' });

    expect(doc.code).toBe('terms');
    expect(db.queries[0]).toContain('INSERT INTO public.legal_documents');
    expect(db.queries[0]).toContain('ON CONFLICT DO NOTHING');
    expect(db.queries).toHaveLength(1);
  });

  it('publishes a version scoped by document code and upserts on (document_id, version)', async () => {
    const db = scripted();
    db.rows = [{
      id: 'ver_1',
      document_id: 'doc_1',
      code: 'terms',
      version: '2026.1',
      content_markdown: '# Termos',
      effective_date: '2026-01-01T00:00:00.000Z',
    }];
    const repo = new PostgresLgpdRepository(db);

    const version = await repo.publishVersion({
      code: 'terms',
      version: '2026.1',
      contentMarkdown: '# Termos',
      effectiveDate: '2026-01-01T00:00:00.000Z',
    });

    expect(version.code).toBe('terms');
    const sql = db.queries[0];
    expect(sql).toContain('INSERT INTO public.legal_document_versions');
    expect(sql).toContain('SELECT id, $2, $3, $4 FROM public.legal_documents WHERE code = $1');
    expect(sql).toContain('ON CONFLICT (document_id, version)');
  });

  it('resolves a document version join (acceptance target)', async () => {
    const db = scripted();
    db.rows = [{
      id: 'ver_1',
      document_id: 'doc_1',
      code: 'terms',
      version: '2026.1',
      content_markdown: '# Termos',
      effective_date: '2026-01-01T00:00:00.000Z',
    }];
    const repo = new PostgresLgpdRepository(db);

    const version = await repo.getDocumentVersion('terms', '2026.1');

    expect(version?.code).toBe('terms');
    expect(db.queries[0]).toContain('JOIN public.legal_documents d ON d.id = v.document_id');
  });

  it('records evidenced acceptances with minimized session evidence', async () => {
    const db = scripted();
    db.rows = [{ ...ACCEPTANCE_ROW }];
    const repo = new PostgresLgpdRepository(db);

    const acceptance = await repo.createAcceptance({
      tenantId: 'tnt_1',
      userId: 'user_1',
      documentVersionId: 'ver_1',
      sessionEvidenceId: 'a1b2c3',
    });

    expect(acceptance.documentCode).toBe('terms');
    const sql = db.queries[0];
    expect(sql).toContain('INSERT INTO public.acceptance_records');
    expect(sql).toContain('session_evidence_id');
  });

  it('creates consents and lists them with withdrawal info', async () => {
    const db = scripted();
    db.rows = [{
      id: 'con_1',
      tenant_id: 'tnt_1',
      user_id: 'user_1',
      purpose: 'marketing',
      granted: true,
      created_at: '2026-08-11T12:00:00.000Z',
      withdrawn_at: null,
      withdrawn_reason: null,
    }];
    const repo = new PostgresLgpdRepository(db);

    const consent = await repo.createConsent({ tenantId: 'tnt_1', userId: 'user_1', purpose: 'marketing' });

    expect(consent.granted).toBe(true);
    expect(db.queries[0]).toContain('INSERT INTO public.consent_records');
  });

  it('lists consents joined with withdrawals (LEFT JOIN)', async () => {
    const db = scripted();
    db.rows = [{
      id: 'con_1',
      tenant_id: 'tnt_1',
      user_id: 'user_1',
      purpose: 'marketing',
      granted: false,
      created_at: '2026-08-11T12:00:00.000Z',
      withdrawn_at: '2026-08-11T13:00:00.000Z',
      withdrawn_reason: 'não quero',
    }];
    const repo = new PostgresLgpdRepository(db);

    const consents = await repo.listConsents('tnt_1', 'user_1');

    expect(consents[0]?.granted).toBe(false);
    expect(consents[0]?.withdrawnReason).toBe('não quero');
    const sql = db.queries[0];
    expect(sql).toContain('LEFT JOIN public.consent_withdrawals w ON w.consent_id = c.id');
  });

  it('lists acceptances joined to document code and version', async () => {
    const db = scripted();
    db.rows = [{ ...ACCEPTANCE_ROW }];
    const repo = new PostgresLgpdRepository(db);

    const acceptances = await repo.listAcceptances('user_1');

    expect(acceptances[0]?.documentVersion).toBe('2026.1');
    const sql = db.queries[0];
    expect(sql).toContain('JOIN public.legal_document_versions v ON v.id = a.document_version_id');
  });

  it('assembles the personal data export from multiple sources', async () => {
    const db = scripted();
    db.rows = [
      { email: 'user@example.com', name: 'Ana', role: 'anunciante', tenant_id: 'tnt_1' },
    ];
    const repo = new PostgresLgpdRepository(db);

    const rows = await repo.exportPersonalData('tnt_1', 'user_1');

    expect(rows.email).toBe('user@example.com');
    expect(Array.isArray(rows.consents)).toBe(true);
    expect(Array.isArray(rows.acceptances)).toBe(true);
    expect(Array.isArray(rows.tenantRoles)).toBe(true);
    expect(Array.isArray(rows.businessMemberships)).toBe(true);
  });
});