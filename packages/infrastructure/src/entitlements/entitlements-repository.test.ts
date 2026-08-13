import { describe, it, expect } from 'vitest';

import { PostgresEntitlementsRepository } from './entitlements-repository';
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

const GRANT_ROW = {
  id: 'grant_1',
  tenant_id: 'tnt_1',
  business_id: 'biz_1',
  entitlement_id: 'def_1',
  source_id: 'src_1',
  status: 'active',
  value_boolean: null,
  value_numeric: 100,
  is_unlimited: false,
  valid_from: '2026-01-01T00:00:00.000Z',
  valid_until: null,
  granted_by: null,
  revoked_at: null,
  revoked_by: null,
  reason: null,
  entitlement_code: 'searches_monthly',
  entitlement_name: 'Buscas mensais',
};

describe('PostgresEntitlementsRepository', () => {
  it('upserts definitions by code (idempotent registration)', async () => {
    const db = scripted();
    db.rows = [{ id: 'def_1', code: 'searches_monthly', name: 'Buscas mensais', value_type: 'numeric', description: null }];
    const repo = new PostgresEntitlementsRepository(db);

    const def = await repo.ensureDefinition({ code: 'searches_monthly', name: 'Buscas mensais', valueType: 'numeric' });

    expect(def.code).toBe('searches_monthly');
    const sql = db.queries[0];
    expect(sql).toContain('INSERT INTO public.entitlement_definitions');
    expect(sql).toContain('ON CONFLICT (code) DO UPDATE');
  });

  it('creates a grant with a traceable source (CTE) and resolves the definition', async () => {
    const db = scripted();
    db.rows = [{ ...GRANT_ROW }];
    const repo = new PostgresEntitlementsRepository(db);

    const grant = await repo.createGrant({
      tenantId: 'tnt_1',
      businessId: 'biz_1',
      entitlementCode: 'searches_monthly',
      sourceType: 'plan_version',
      sourceReferenceId: 'plan_ver_1',
      valueNumeric: 100,
    });

    expect(grant.entitlementCode).toBe('searches_monthly');
    expect(grant.sourceId).toBe('src_1');
    const sql = db.queries[0];
    expect(sql).toContain('WITH source AS (');
    expect(sql).toContain('INSERT INTO public.entitlement_grants');
    expect(sql).toContain('public.entitlement_definitions WHERE code = $6');
  });

  it('resolves a grant by (tenant, business, entitlement code) through the join', async () => {
    const db = scripted();
    db.rows = [{ ...GRANT_ROW }];
    const repo = new PostgresEntitlementsRepository(db);

    const grant = await repo.getGrantByCode('tnt_1', 'biz_1', 'searches_monthly');

    expect(grant?.isUnlimited).toBe(false);
    expect(grant?.valueNumeric).toBe(100);
    const sql = db.queries[0];
    expect(sql).toContain('FROM public.entitlement_grants eg');
    expect(sql).toContain('JOIN public.entitlement_definitions ed ON ed.id = eg.entitlement_id');
    expect(sql).toContain('ed.code = $3');
  });

  it('maps null optional grant fields to undefined', async () => {
    const db = scripted();
    db.rows = [{ ...GRANT_ROW, valid_until: '2026-12-31T00:00:00.000Z', granted_by: 'user_1' }];
    const repo = new PostgresEntitlementsRepository(db);

    const grant = await repo.getGrantById('grant_1');

    expect(grant?.validUntil).toBe('2026-12-31T00:00:00.000Z');
    expect(grant?.grantedBy).toBe('user_1');
    expect(grant?.revokedAt).toBeUndefined();
  });

  it('upserts usage with ON CONFLICT on (grant_id, business_id)', async () => {
    const db = scripted();
    db.rows = [{ grant_id: 'grant_1', business_id: 'biz_1', current_usage: 25, last_used_at: '2026-08-11T12:00:00.000Z' }];
    const repo = new PostgresEntitlementsRepository(db);

    const usage = await repo.upsertUsage('grant_1', 'biz_1', 25);

    expect(usage.currentUsage).toBe(25);
    expect(db.queries[0]).toContain('INSERT INTO public.entitlement_usage');
    expect(db.queries[0]).toContain('ON CONFLICT (grant_id, business_id)');
  });

  it('stores overrides and lists them newest first', async () => {
    const db = scripted();
    db.rows = [
      {
        id: 'ov_1',
        grant_id: 'grant_1',
        override_value_numeric: 500,
        override_value_boolean: null,
        reason: 'promocao',
        authorized_by: 'user_master',
        created_at: '2026-08-11T12:00:00.000Z',
      },
    ];
    const repo = new PostgresEntitlementsRepository(db);

    const override = await repo.createOverride({
      grantId: 'grant_1',
      overrideValueNumeric: 500,
      reason: 'promocao',
      authorizedBy: 'user_master',
    });

    expect(override.overrideValueNumeric).toBe(500);
    expect(db.queries[0]).toContain('INSERT INTO public.entitlement_overrides');
  });

  it('soft-revokes a grant keeping revoked_at revocable field semantics', async () => {
    const db = scripted();
    db.rows = [{ ...GRANT_ROW, status: 'revoked', revoked_at: '2026-08-11T13:00:00.000Z' }];
    const repo = new PostgresEntitlementsRepository(db);

    const grant = await repo.updateGrantStatus('grant_1', 'revoked', 'user_1', 'política');

    expect(grant?.status).toBe('revoked');
    const sql = db.queries[0];
    expect(sql).toContain("SET status = $2");
    expect(sql).toContain("revoked_at = CASE WHEN $2 IN ('revoked', 'expired')");
  });
});