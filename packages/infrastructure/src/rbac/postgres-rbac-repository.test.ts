import { describe, it, expect } from 'vitest';

import { PostgresRbacRepository } from './rbac-repository';
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

describe('PostgresRbacRepository', () => {
  it('resolves active tenant role codes via the user_roles join (has_tenant_admin_access semantics)', async () => {
    const db = scripted();
    db.rows = [
      { code: 'tenant_admin' },
      { code: 'editor' },
    ];
    const repo = new PostgresRbacRepository(db);

    const codes = await repo.getActiveRoleCodesForUser('tnt_1', 'user_1');

    expect(codes).toEqual(['tenant_admin', 'editor']);
    const sql = db.queries[0];
    expect(sql).toContain('FROM public.user_roles ur');
    expect(sql).toContain('JOIN public.roles r ON r.id = ur.role_id');
    expect(sql).toContain("ur.status = 'active'");
    expect(sql).toContain('ur.tenant_id = $1');
  });

  it('resolves business member roles scoped by tenant and business (has_business_permission semantics)', async () => {
    const db = scripted();
    db.rows = [{ role: 'sales' }];
    const repo = new PostgresRbacRepository(db);

    const role = await repo.getBusinessMemberRole('tnt_1', 'biz_1', 'user_1');

    expect(role).toBe('sales');
    const sql = db.queries[0];
    expect(sql).toContain('FROM public.business_members');
    expect(sql).toContain('tenant_id = $1 AND business_id = $2 AND user_id = $3');
    expect(sql).toContain("status = 'active'");
  });

  it('resolves user permission codes through roles->permissions', async () => {
    const db = scripted();
    db.rows = [{ code: 'business:update' }, { code: 'billing:view' }];
    const repo = new PostgresRbacRepository(db);

    const codes = await repo.listUserPermissionCodes('tnt_1', 'user_1');

    expect(codes).toEqual(['business:update', 'billing:view']);
    expect(db.queries[0]).toContain('JOIN public.role_permissions rp ON rp.role_id = r.id');
  });

  it('inserts an elevated access session and maps it to camelCase', async () => {
    const db = scripted();
    db.rows = [
      {
        id: 'ses_1',
        user_id: 'requester_1',
        tenant_id: 'tnt_1',
        business_id: null,
        reason: 'debug',
        scope: 'support:elevated_access',
        status: 'active',
        requested_at: '2026-08-11T12:00:00.000Z',
        approved_by: null,
        approved_at: null,
        expires_at: '2026-08-11T13:00:00.000Z',
        revoked_at: null,
      },
    ];
    const repo = new PostgresRbacRepository(db);

    const session = await repo.createElevatedSession({
      userId: 'requester_1',
      tenantId: 'tnt_1',
      reason: 'debug',
      scope: 'support:elevated_access',
      expiresAt: '2026-08-11T13:00:00.000Z',
    });

    expect(session.id).toBe('ses_1');
    expect(session.userId).toBe('requester_1');
    expect(session.tenantId).toBe('tnt_1');
    expect(session.approvedAt).toBeUndefined();
    expect(db.queries[0]).toContain('INSERT INTO public.elevated_access_sessions');
  });

  it('approves a session with COALESCE updates (idempotent approval fields)', async () => {
    const db = scripted();
    db.rows = [
      {
        id: 'ses_1',
        user_id: 'requester_1',
        tenant_id: null,
        business_id: null,
        reason: 'debug',
        scope: 'support:elevated_access',
        status: 'active',
        requested_at: '2026-08-11T12:00:00.000Z',
        approved_by: 'user_master',
        approved_at: '2026-08-11T12:05:00.000Z',
        expires_at: '2026-08-11T13:00:00.000Z',
        revoked_at: null,
      },
    ];
    const repo = new PostgresRbacRepository(db);

    const session = await repo.updateElevatedSession({
      id: 'ses_1',
      status: 'active',
      approvedBy: 'user_master',
      approvedAt: '2026-08-11T12:05:00.000Z',
    });

    expect(session?.approvedBy).toBe('user_master');
    expect(db.queries[0]).toContain('UPDATE public.elevated_access_sessions');
    expect(db.queries[0]).toContain('approved_by = COALESCE($3, approved_by)');
  });

  it('lists only active non-expired elevated sessions for a user', async () => {
    const db = scripted();
    const repo = new PostgresRbacRepository(db);

    await repo.listActiveElevatedSessions('requester_1');

    const sql = db.queries[0];
    expect(sql).toContain("WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()");
  });
});