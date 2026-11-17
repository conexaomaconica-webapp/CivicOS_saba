// Migration 250 (endurecimento de funções SECURITY DEFINER) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas equivalentes às colunas lidas; trigger_operational_notification é stub (só o privilégio é testado);
// RLS/JWT reais não são exercitados (auth.uid()/auth.role() simulados).
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let passed = 0, failed = 0; const failures = [];
async function ok(name, fn) { try { await fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failed += 1; failures.push(`${name}: ${e.message}`); console.log(`  ✗ ${name}\n      ${e.message}`); } }
const eq = (a, b, l = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${l} esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)}`); };

const STUBS = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role', true), '') $$;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_id UUID);
  CREATE TABLE public.business_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, business_id UUID, user_id UUID, role TEXT, status TEXT DEFAULT 'active');
  CREATE FUNCTION public.has_tenant_admin_access(p UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT current_setting('test.admin', true) = 'on' $$;
  CREATE TABLE public.business_services (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID, display_order INT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE public.business_benefits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID, display_order INT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE public.business_analytics_events (event_type VARCHAR(50), tenant_id UUID, business_id UUID, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE public.contracts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID, status TEXT);
  CREATE TABLE public.contract_snapshots (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), contract_id UUID, rendered_text TEXT, sha256_hash TEXT);
  CREATE TABLE public.contract_acceptances (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), snapshot_id UUID, accepted_at TIMESTAMPTZ DEFAULT now(), ip_address TEXT, user_agent TEXT, user_id UUID);
  -- trigger_operational_notification: stub (a migration 164 a altera dinamicamente, por isso a 250 só muda privilégios dela).
  CREATE FUNCTION public.record_business_analytics_event(a UUID, b UUID, c VARCHAR, d VARCHAR, e TEXT) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
  CREATE FUNCTION public.record_directory_analytics_event(a UUID, b VARCHAR, c TEXT, d TEXT, e TEXT, f VARCHAR) RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
  GRANT EXECUTE ON FUNCTION public.record_business_analytics_event(UUID,UUID,VARCHAR,VARCHAR,TEXT) TO PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.record_directory_analytics_event(UUID,VARCHAR,TEXT,TEXT,TEXT,VARCHAR) TO PUBLIC, anon, authenticated, service_role;
  CREATE FUNCTION public.trigger_operational_notification(p_tenant_id UUID, p_recipient_id UUID, p_recipient_email TEXT, p_event_type VARCHAR, p_title TEXT, p_body TEXT, p_action_url TEXT, p_channel VARCHAR) RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
  GRANT EXECUTE ON FUNCTION public.trigger_operational_notification(UUID,UUID,TEXT,VARCHAR,TEXT,TEXT,TEXT,VARCHAR) TO PUBLIC, anon, authenticated, service_role;
`;
// O rollback recria as funções ORIGINAIS com os privilégios abertos: é o estado "antes".
const freshDb = async (apply250) => {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/migrations/248_business_owner_permission.sql'));
  await db.exec(read('supabase/rollbacks/connections/250_rollback.sql'));
  if (apply250) await db.exec(read('supabase/migrations/250_security_definer_hardening.sql'));
  return db;
};
const as = async (db, uid, { admin = false, role = 'authenticated' } = {}) => { await db.exec(`SET test.uid = '${uid ?? ''}'; SET test.admin = '${admin ? 'on' : 'off'}'; SET test.role = '${role}'`); };
const can = async (db, role, fn) => (await db.query(`SELECT has_function_privilege($1, p.oid, 'execute') AS r FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = $2`, [role, fn])).rows.map((r) => r.r);
const denied = async (fn, re) => { try { await fn(); } catch (e) { if (re.test(e.message)) return; throw new Error('erro inesperado: ' + e.message); } throw new Error('deveria ter sido negado'); };

const tenant = randomUUID(); const owner = randomUUID(); const stranger = randomUUID(); const manager = randomUUID(); const viewer = randomUUID();
const biz = randomUUID();
const seed = async (db) => {
  await db.query(`INSERT INTO public.businesses VALUES ($1,$2,$3)`, [biz, tenant, owner]);
  await db.query(`INSERT INTO public.business_members (tenant_id,business_id,user_id,role) VALUES ($1,$2,$3,'manager'),($1,$2,$4,'viewer')`, [tenant, biz, manager, viewer]);
  for (const t of ['business_services', 'business_benefits']) {
    await db.query(`INSERT INTO public.${t} (business_id, display_order) VALUES ($1,1),($1,2)`, [biz]);
  }
  await db.query(`INSERT INTO public.business_analytics_events (event_type, tenant_id, business_id) VALUES ('view',$1,$2),('view',$1,$2)`, [tenant, biz]);
  const c = (await db.query(`INSERT INTO public.contracts (business_id, status) VALUES ($1,'signed') RETURNING id`, [biz])).rows[0].id;
  const s = (await db.query(`INSERT INTO public.contract_snapshots (contract_id, rendered_text, sha256_hash) VALUES ($1,'texto','abc') RETURNING id`, [c])).rows[0].id;
  await db.query(`INSERT INTO public.contract_acceptances (snapshot_id, ip_address, user_agent, user_id) VALUES ($1,'1.2.3.4','UA',$2)`, [s, owner]);
};
const snapshot = async (db) => (await db.query(`SELECT public.get_signed_contract_snapshot($1::uuid) AS r`, [biz])).rows[0].r;
const summary = async (db) => (await db.query(`SELECT * FROM public.get_business_analytics_summary($1::uuid,$2::uuid,30)`, [tenant, biz])).rows;
const orderOf = async (db, t, ids) => { const rows = (await db.query(`SELECT id, display_order FROM public.${t} WHERE business_id = $1`, [biz])).rows; return ids.map((id) => rows.find((r) => r.id === id).display_order); };

console.log('Migration 250 · endurecimento SECURITY DEFINER (PGlite)');

await ok('ANTES: anon e authenticated executam as 11 funções (reproduz o estado confirmado no banco)', async () => {
  const db = await freshDb(false);
  for (const fn of ['get_admin_dashboard_metrics', 'get_admin_lodges_list', 'trigger_operational_notification', 'record_business_analytics_event', 'record_directory_analytics_event', 'get_signed_contract_snapshot', 'reorder_business_services', 'reorder_business_benefits', 'get_business_analytics_summary']) {
    eq(await can(db, 'anon', fn), [true], fn + ' anon'); eq(await can(db, 'authenticated', fn), [true], fn + ' authenticated');
  }
  await seed(db); await as(db, stranger, { role: 'anon' });
  eq(Boolean(await snapshot(db)), true, 'contrato lido por quem não tem vínculo (falha reproduzida)');
});
await ok('DEPOIS: funções apenas-servidor só executam por service_role', async () => {
  const db = await freshDb(true);
  for (const fn of ['get_admin_dashboard_metrics', 'get_admin_lodges_list', 'trigger_operational_notification', 'record_business_analytics_event', 'record_directory_analytics_event']) {
    eq(await can(db, 'anon', fn), [false], fn + ' anon'); eq(await can(db, 'authenticated', fn), [false], fn + ' authenticated'); eq(await can(db, 'service_role', fn), [true], fn + ' service_role');
  }
});
await ok('DEPOIS: funções com checagem interna não são mais executáveis por anon, e seguem para authenticated/service_role', async () => {
  const db = await freshDb(true);
  for (const fn of ['get_signed_contract_snapshot', 'reorder_business_services', 'reorder_business_benefits', 'get_business_analytics_summary']) {
    eq(await can(db, 'anon', fn), [false], fn + ' anon'); eq(await can(db, 'authenticated', fn), [true], fn + ' authenticated'); eq(await can(db, 'service_role', fn), [true], fn + ' service_role');
  }
});
await ok('trava interna: funções do admin recusam usuário comum/anônimo mesmo se alguém conceder EXECUTE de novo; o servidor passa da trava', async () => {
  const db = await freshDb(true);
  await db.exec('GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO PUBLIC, anon, authenticated');
  const lodges = "SELECT public.get_admin_lodges_list(NULL,NULL,NULL,NULL,false,false,1,10)";
  for (const role of ['authenticated', 'anon']) {
    await as(db, randomUUID(), { role });
    await denied(() => db.query('SELECT public.get_admin_dashboard_metrics()'), /FORBIDDEN: Função restrita ao servidor/);
    await denied(() => db.query(lodges), /FORBIDDEN: Função restrita ao servidor/);
  }
  await as(db, null, { role: 'service_role' });
  for (const q of ['SELECT public.get_admin_dashboard_metrics()', lodges]) {
    try { await db.query(q); } catch (e) { if (/FORBIDDEN/.test(e.message)) throw new Error('o servidor não deveria ser barrado: ' + e.message); /* falha posterior por tabelas ausentes é esperada */ }
  }
});
await ok('contrato (IP/navegador): dono, admin e finance veem; sem vínculo, viewer e manager não; servidor vê', async () => {
  const db = await freshDb(true); await seed(db);
  await db.query(`INSERT INTO public.business_members (tenant_id,business_id,user_id,role) VALUES ($1,$2,$3,'finance')`, [tenant, biz, randomUUID()]);
  await as(db, owner); eq((await snapshot(db)).ip_address, '1.2.3.4');
  await as(db, stranger, { admin: true }); eq((await snapshot(db)).ok, true);
  await as(db, null, { role: 'service_role' }); eq((await snapshot(db)).ok, true);
  await as(db, stranger); await denied(() => snapshot(db), /FORBIDDEN/);
  await as(db, viewer); await denied(() => snapshot(db), /FORBIDDEN/);
  await as(db, manager); await denied(() => snapshot(db), /FORBIDDEN/);
});
await ok('reordenar serviços e benefícios: dono e gerente reordenam (a troca acontece); sem vínculo e viewer são negados e nada muda', async () => {
  const db = await freshDb(true); await seed(db);
  for (const [fn, table] of [['reorder_business_services', 'business_services'], ['reorder_business_benefits', 'business_benefits']]) {
    const ids = (await db.query(`SELECT id FROM public.${table} WHERE business_id=$1 ORDER BY display_order`, [biz])).rows.map((r) => r.id);
    await as(db, stranger); await denied(() => db.query(`SELECT public.${fn}($1,$2,'down')`, [biz, ids[0]]), /FORBIDDEN/);
    await as(db, viewer); await denied(() => db.query(`SELECT public.${fn}($1,$2,'down')`, [biz, ids[0]]), /FORBIDDEN/);
    eq(await orderOf(db, table, ids), [1, 2], 'nada mudou');
    await as(db, owner); await db.query(`SELECT public.${fn}($1,$2,'down')`, [biz, ids[0]]);
    eq(await orderOf(db, table, ids), [2, 1], 'dono reordenou');
    await as(db, manager); await db.query(`SELECT public.${fn}($1,$2,'up')`, [biz, ids[0]]);
    eq(await orderOf(db, table, ids), [1, 2], 'gerente reordenou');
  }
});
await ok('métricas (summary): dono, membro e admin veem; sem vínculo é negado; o resultado não muda', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, owner); eq(Number((await summary(db))[0].total_count), 2);
  await as(db, viewer); eq(Number((await summary(db))[0].total_count), 2);
  await as(db, stranger, { admin: true }); eq((await summary(db)).length, 1);
  await as(db, stranger); await denied(() => summary(db), /FORBIDDEN/);
  await as(db, owner); await denied(() => db.query(`SELECT * FROM public.get_business_analytics_summary($1,$2,30)`, [randomUUID(), biz]), /FORBIDDEN/);
});
await ok('rollback reabre como antes e a 250 pode ser reaplicada', async () => {
  const db = await freshDb(true); await seed(db);
  await db.exec(read('supabase/rollbacks/connections/250_rollback.sql'));
  eq(await can(db, 'anon', 'get_signed_contract_snapshot'), [true]); eq(await can(db, 'anon', 'get_admin_dashboard_metrics'), [true]);
  await db.exec(read('supabase/migrations/250_security_definer_hardening.sql'));
  eq(await can(db, 'anon', 'get_signed_contract_snapshot'), [false]); eq(await can(db, 'authenticated', 'get_admin_dashboard_metrics'), [false]);
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
