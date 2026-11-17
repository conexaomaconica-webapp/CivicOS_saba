import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Simulações: cabeçalhos da requisição, sessão do visitante e banco (cliente de serviço) ----
let userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1';
let sessionUserId: string | null = null;
const db: Record<string, any> = {};
const inserts: Array<{ table: string; rows: any }> = [];

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'user-agent': userAgent, host: 'conexaomaconica.com.br', 'x-forwarded-for': '1.2.3.4' }),
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => undefined }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUserId ? { id: sessionUserId } : null } }) } }),
}));
vi.mock('@/lib/analytics/analytics-auth', () => ({ assertBusinessAnalyticsAccess: vi.fn() }));
vi.mock('@/lib/analytics/visitor-key', () => ({ readVisitorKey: async () => 'visitor-key' }), { virtual: true } as never);

function builder(table: string) {
  const state: any = { table, filters: {} };
  const result = () => {
    const spec = db[table];
    if (typeof spec === 'function') return spec(state.filters);
    if (spec && typeof spec === 'object' && 'data' in spec) return spec;
    return { data: spec ?? null, error: null };
  };
  const api: any = {
    select: () => api,
    eq: (k: string, v: unknown) => { state.filters[k] = v; return api; },
    in: (k: string, v: unknown) => { state.filters[k] = v; return api; },
    ilike: () => api,
    gte: () => api,
    order: () => api,
    limit: () => api,
    range: () => api,
    maybeSingle: async () => {
      const r = result();
      return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error ?? null };
    },
    insert: async (rows: any) => { inserts.push({ table, rows }); return { error: null }; },
    then: (resolve: (v: unknown) => unknown) => resolve(result()),
  };
  return api;
}
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (t: string) => builder(t), rpc: async () => ({ data: null, error: null }) }),
}));

const BIZ = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1';
  sessionUserId = null;
  inserts.length = 0;
  for (const k of Object.keys(db)) delete db[k];
  db.profiles = { role: 'member' };
  db.businesses = (f: any) => (f.owner_id !== undefined ? { data: [], error: null } : { data: [{ id: BIZ, tenant_id: 'tenant-1', publication_status: 'published', is_active: true }], error: null });
  db.business_members = { data: [], error: null };
  db.analytics_events = { data: [], error: null };
});

import { classifyTraffic, isAutomatedUserAgent, shouldExcludeFromMetrics } from '../src/lib/analytics/internal-traffic';
import { trackDirectoryEventAction, trackSearchImpressionsAction } from '../src/lib/analytics/analytics-service';

describe('tráfego automatizado (User-Agent)', () => {
  it('identifica ferramentas de teste e verificadores, e não confunde navegadores comuns', () => {
    for (const ua of ['Mozilla/5.0 HeadlessChrome/120', 'Playwright/1.4', 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'curl/8.0', 'Lighthouse', 'python-requests/2.31', 'WhatsApp/2.23', 'facebookexternalhit/1.1']) {
      expect(isAutomatedUserAgent(ua), ua).toBe(true);
    }
    for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1', 'Mozilla/5.0 (Linux; Android 14; Cubot P80) Chrome/120 Mobile Safari/537.36', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36', '']) {
      expect(isAutomatedUserAgent(ua), ua).toBe(false);
    }
  });
});

describe('classificação do visitante', () => {
  it('visitante público sem login conta', async () => {
    const c = await classifyTraffic([BIZ]);
    expect(shouldExcludeFromMetrics(c, BIZ)).toBe(false);
  });
  it('usuário logado sem vínculo conta (pode ser cliente de outra empresa)', async () => {
    sessionUserId = USER;
    const c = await classifyTraffic([BIZ]);
    expect(shouldExcludeFromMetrics(c, BIZ)).toBe(false);
  });
  it('dono da própria empresa não conta, mas conta ao visitar OUTRA empresa', async () => {
    sessionUserId = USER;
    db.businesses = (f: any) => (f.owner_id === USER ? { data: [{ id: BIZ }], error: null } : { data: [], error: null });
    const c = await classifyTraffic([BIZ, OTHER]);
    expect(shouldExcludeFromMetrics(c, BIZ)).toBe(true);
    expect(shouldExcludeFromMetrics(c, OTHER)).toBe(false);
  });
  it('equipe ativa da empresa (co-dono, funcionário) não conta', async () => {
    sessionUserId = USER;
    db.business_members = { data: [{ business_id: BIZ }], error: null };
    expect(shouldExcludeFromMetrics(await classifyTraffic([BIZ]), BIZ)).toBe(true);
  });
  it('administrador da plataforma não conta em nenhuma empresa', async () => {
    sessionUserId = USER;
    db.profiles = { role: 'master' };
    const c = await classifyTraffic([BIZ, OTHER]);
    expect(shouldExcludeFromMetrics(c, BIZ)).toBe(true);
    expect(shouldExcludeFromMetrics(c, OTHER)).toBe(true);
  });
  it('robô/teste automatizado não conta, mesmo sem login', async () => {
    userAgent = 'Mozilla/5.0 HeadlessChrome/120.0';
    expect(shouldExcludeFromMetrics(await classifyTraffic([BIZ]), BIZ)).toBe(true);
  });
  it('falha ao identificar (erro no banco/sessão) NÃO presume identidade: o evento conta', async () => {
    sessionUserId = USER;
    db.profiles = () => { throw new Error('banco indisponível'); };
    expect(shouldExcludeFromMetrics(await classifyTraffic([BIZ]), BIZ)).toBe(false);
  });
});

describe('gravação dos eventos (efeito real)', () => {
  const view = () => trackDirectoryEventAction({ businessId: BIZ, eventType: 'view', cycleId: 'cycle_' + Math.random().toString(36).slice(2) + '_abcdefgh' });
  const eventInserts = () => inserts.filter((i) => i.table === 'analytics_events');

  it('visitante externo: grava o evento', async () => {
    const r = await view();
    expect(r.ok).toBe(true);
    expect(eventInserts().length).toBe(1);
  });
  it('dono da empresa: não grava nada (visualização e clique)', async () => {
    sessionUserId = USER;
    db.businesses = (f: any) => (f.owner_id === USER ? { data: [{ id: BIZ }], error: null } : { data: [{ id: BIZ, tenant_id: 'tenant-1', publication_status: 'published', is_active: true }], error: null });
    expect((await view()).skipped).toBe(true);
    expect((await trackDirectoryEventAction({ businessId: BIZ, eventType: 'whatsapp_click' })).skipped).toBe(true);
    expect(eventInserts().length).toBe(0);
  });
  it('administrador e robô: não gravam', async () => {
    sessionUserId = USER; db.profiles = { role: 'admin' };
    expect((await view()).skipped).toBe(true);
    sessionUserId = null; db.profiles = { role: 'member' }; userAgent = 'Playwright/1.4';
    expect((await view()).skipped).toBe(true);
    expect(eventInserts().length).toBe(0);
  });
  it('aparições em lote: o dono não conta a própria empresa, mas as demais do lote contam', async () => {
    sessionUserId = USER;
    db.businesses = (f: any) =>
      f.owner_id === USER
        ? { data: [{ id: BIZ }], error: null }
        : { data: [{ id: BIZ, tenant_id: 't1' }, { id: OTHER, tenant_id: 't1' }], error: null };
    const r = await trackSearchImpressionsAction([BIZ, OTHER]);
    expect(r).toMatchObject({ ok: true, count: 1 });
    const rows = eventInserts()[0]!.rows as Array<{ business_id: string }>;
    expect(rows.map((x) => x.business_id)).toEqual([OTHER]);
  });
});
