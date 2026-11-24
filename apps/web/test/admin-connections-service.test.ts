import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const TENANT = '33333333-3333-4333-8333-333333333333';
const CONN = '44444444-4444-4444-8444-444444444444';
const BIZ = '55555555-5555-4555-8555-555555555555';

let actorRole = 'master';
let connection: any = null;
const ops: Array<{ table: string; op: string; values?: any; filters: Record<string, unknown> }> = [];
const tables: Record<string, any> = {};

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/admin/admin-tenant-context', () => ({
  resolveCanonicalAdminTenant: async () => {
    if (actorRole === 'anonimo') throw new Error('UNAUTHORIZED: Sessão expirada.');
    return { user: { id: ACTOR }, tenantId: TENANT, supabase: {}, host: 'x' };
  },
}));
vi.mock('@/lib/member/profile-access-service', () => ({
  getProfileAuthorization: async () => ({ id: ACTOR, role: actorRole, tenant_id: TENANT, status: 'active' }),
}));

function from(table: string) {
  const state = { op: 'select', values: undefined as any, filters: {} as Record<string, unknown> };
  const finish = () => {
    ops.push({ table, op: state.op, values: state.values, filters: state.filters });
    const spec = tables[table];
    const data = typeof spec === 'function' ? spec(state) : spec;
    return { data: data ?? [], error: null, count: Array.isArray(data) ? data.length : 0 };
  };
  const api: any = {
    select: () => api,
    insert: async (row: any) => { ops.push({ table, op: 'insert', values: row, filters: {} }); return { error: null }; },
    update: (values: any) => { state.op = 'update'; state.values = values; return api; },
    delete: () => { state.op = 'delete'; return api; },
    eq: (k: string, v: unknown) => { state.filters[k] = v; return api; },
    in: (k: string, v: unknown) => { state.filters[`in:${k}`] = v; return api; },
    ilike: (k: string, v: unknown) => { state.filters[`ilike:${k}`] = v; return api; },
    or: (v: string) => { state.filters.or = v; return api; },
    order: () => api, range: () => api, limit: () => api,
    maybeSingle: async () => { const r = finish(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: null }; },
    then: (resolve: (v: unknown) => unknown) => resolve(finish()),
  };
  return api;
}

vi.mock('@/lib/auth/account-temp-password-admin', () => ({ getAccountAdminClient: () => ({ from }) }));

import {
  deleteAdminConnectionAction,
  listAdminConnectionsAction,
  removeBusinessConnectionsAction,
  setAdminConnectionStatusAction,
  updateAdminConnectionAction,
} from '../src/lib/admin/admin-connections-service';

const row = (o: Record<string, unknown> = {}) => ({
  id: CONN, business_id: BIZ, member_user_id: ACTOR, connection_type: 'compra', item_description: 'Óculos', message: 'Ótimo',
  status: 'confirmada', confirmed_at: '2026-11-01T10:00:00Z', created_at: '2026-10-30T10:00:00Z', ...o,
});
const audits = () => ops.filter((o) => o.table === 'admin_audit_logs' && o.op === 'insert').map((o) => o.values);
const writes = (table = 'business_connections') => ops.filter((o) => o.table === table && ['update', 'delete'].includes(o.op));

beforeEach(() => {
  actorRole = 'master';
  ops.length = 0;
  for (const k of Object.keys(tables)) delete tables[k];
  connection = row();
  tables.business_connections = (s: any) => (s.op === 'update' && s.filters['in:status'] ? [{ id: CONN }, { id: 'x2' }] : connection ? [connection] : []);
});

describe('quem pode usar (autorização no servidor)', () => {
  it('somente master/admin; os demais perfis são recusados em TODAS as ações e nada é gravado', async () => {
    for (const role of ['member', 'anunciante', 'finance', 'moderator', '']) {
      actorRole = role;
      for (const r of [
        await listAdminConnectionsAction({}),
        await updateAdminConnectionAction(CONN, { message: 'x' }),
        await setAdminConnectionStatusAction(CONN, 'remover'),
        await deleteAdminConnectionAction(CONN),
        await removeBusinessConnectionsAction(BIZ),
      ]) {
        expect(r.success).toBe(false);
      }
    }
    expect(writes()).toHaveLength(0);
    expect(audits()).toHaveLength(0);
  });
});

describe('listagem e busca', () => {
  it('lista restrita ao tenant, com empresa e membro', async () => {
    tables.business_connections = [{ ...row(), photo_url: 'x', share_on_mural: true, businesses: { id: BIZ, name: 'Óptica Circulô', slug: 'opticacirculo', is_active: true, publication_status: 'published' } }];
    tables.profiles = [{ id: ACTOR, name: 'Maria Souza', email: 'maria@x.com' }];
    const r = await listAdminConnectionsAction({ page: 1 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.items[0]).toMatchObject({ business: { name: 'Óptica Circulô', active: true, published: true }, member: { name: 'Maria Souza' }, hasPhoto: true });
    }
    expect(ops[0]!.filters.tenant_id).toBe(TENANT);
  });

  it('busca saneada: coringas e separadores do filtro não passam', async () => {
    tables.businesses = [{ id: BIZ }];
    tables.profiles = [];
    await listAdminConnectionsAction({ search: 'cir%culo),member_user_id.eq.x' });
    const bizQuery = ops.find((o) => o.table === 'businesses')!;
    const like = String(bizQuery.filters['ilike:name']);
    expect(like).not.toMatch(/[,()]/);
    expect(like.replace(/^%|%$/g, '')).not.toMatch(/[%_]/);
  });
});

describe('editar', () => {
  it('valida tipo e tamanhos; grava só o que mudou e audita antes/depois', async () => {
    expect((await updateAdminConnectionAction(CONN, { connectionType: 'doacao' })).success).toBe(false);
    expect((await updateAdminConnectionAction(CONN, { itemDescription: 'x'.repeat(161) })).success).toBe(false);
    expect((await updateAdminConnectionAction(CONN, { message: 'y'.repeat(401) })).success).toBe(false);
    expect((await updateAdminConnectionAction(CONN, {})).success).toBe(false);
    expect(writes()).toHaveLength(0);

    const ok = await updateAdminConnectionAction(CONN, { itemDescription: '  Armação   nova ', message: '' });
    expect(ok.success).toBe(true);
    const w = writes()[0]!;
    expect(w.values).toMatchObject({ item_description: 'Armação nova', message: null });
    expect(w.values).not.toHaveProperty('status');
    expect(w.filters).toMatchObject({ id: CONN, tenant_id: TENANT });
    expect(audits()[0]).toMatchObject({ action: 'CONNECTION_EDITED', entity_type: 'business_connection', entity_id: CONN });
  });
});

describe('remover do mural e restaurar', () => {
  it('remover: status removida, foto retirada, denúncias resolvidas e auditoria', async () => {
    const r = await setAdminConnectionStatusAction(CONN, 'remover', 'empresa saiu');
    expect(r).toEqual({ success: true, status: 'removida' });
    const upd = writes()[0]!;
    expect(upd.values).toMatchObject({ status: 'removida', photo_url: null, moderation_note: 'empresa saiu' });
    expect(writes('connection_reports')).toHaveLength(1);
    expect(audits()[0]).toMatchObject({ action: 'CONNECTION_REMOVED', reason: 'empresa saiu' });
  });

  it('remover uma já removida: recusa', async () => {
    connection = row({ status: 'removida' });
    expect((await setAdminConnectionStatusAction(CONN, 'remover')).success).toBe(false);
  });

  it('restaurar: só se estava removida E já tinha sido confirmada', async () => {
    connection = row({ status: 'confirmada' });
    expect((await setAdminConnectionStatusAction(CONN, 'restaurar')).success).toBe(false);
    connection = row({ status: 'removida', confirmed_at: null });
    expect((await setAdminConnectionStatusAction(CONN, 'restaurar')).success).toBe(false);
    expect(writes()).toHaveLength(0);

    connection = row({ status: 'removida' });
    expect(await setAdminConnectionStatusAction(CONN, 'restaurar')).toEqual({ success: true, status: 'confirmada' });
    expect(writes()[0]!.values).toMatchObject({ status: 'confirmada' });
    expect(audits()[0]).toMatchObject({ action: 'CONNECTION_RESTORED' });
  });

  it('aprovar: publica conexão pendente com confirmed_at e share_on_mural = true e registra auditoria', async () => {
    connection = row({ status: 'pendente', confirmed_at: null, share_on_mural: false });
    expect(await setAdminConnectionStatusAction(CONN, 'aprovar')).toEqual({ success: true, status: 'confirmada' });
    expect(writes()[0]!.values).toMatchObject({
      status: 'confirmada',
      share_on_mural: true,
    });
    expect(typeof writes()[0]!.values.confirmed_at).toBe('string');
    expect(audits()[0]).toMatchObject({ action: 'CONNECTION_APPROVED_BY_ADMIN' });
  });

  it('aprovar: recusa se já confirmada ou removida', async () => {
    connection = row({ status: 'confirmada' });
    expect((await setAdminConnectionStatusAction(CONN, 'aprovar')).success).toBe(false);
    connection = row({ status: 'removida' });
    expect((await setAdminConnectionStatusAction(CONN, 'aprovar')).success).toBe(false);
    expect(writes()).toHaveLength(0);
  });
});

describe('excluir definitivamente e remover todas da empresa', () => {
  it('excluir: apaga só no tenant e audita sem foto nem comentário', async () => {
    expect((await deleteAdminConnectionAction(CONN)).success).toBe(true);
    const del = writes().find((w) => w.op === 'delete')!;
    expect(del.filters).toMatchObject({ id: CONN, tenant_id: TENANT });
    const a = audits()[0]!;
    expect(a.action).toBe('CONNECTION_DELETED');
    expect(JSON.stringify(a)).not.toMatch(/Ótimo|Óculos|photo/);
  });

  it('conexão de outro tenant/inexistente: não apaga', async () => {
    connection = null;
    const r = await deleteAdminConnectionAction(CONN);
    expect(r.success).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it('remover todas da empresa: só pendentes e confirmadas, devolve a contagem e audita uma vez', async () => {
    const r = await removeBusinessConnectionsAction(BIZ, 'empresa saiu');
    expect(r).toEqual({ success: true, removed: 2 });
    const upd = writes()[0]!;
    expect(upd.filters).toMatchObject({ tenant_id: TENANT, business_id: BIZ, 'in:status': ['pendente', 'confirmada'] });
    expect(audits()).toHaveLength(1);
    expect(audits()[0]).toMatchObject({ action: 'BUSINESS_CONNECTIONS_REMOVED', entity_id: BIZ });
  });
});
