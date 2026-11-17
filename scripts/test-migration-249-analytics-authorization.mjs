// Migration 249 (autorização em get_business_analytics_aggregate_metrics) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas (businesses, business_members, analytics_events) e has_tenant_admin_access simulada; RLS/JWT reais não são exercitados.
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
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_id UUID, is_active BOOLEAN DEFAULT true);
  CREATE TABLE public.business_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, business_id UUID, user_id UUID, role TEXT, status TEXT DEFAULT 'active');
  CREATE TABLE public.analytics_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID, tenant_id UUID, event_name TEXT, pseudonymous_subject_id TEXT, source TEXT, metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT now());
  CREATE FUNCTION public.has_tenant_admin_access(p UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT current_setting('test.admin', true) = 'on' $$;
`;
const freshDb = async (apply249) => {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/migrations/248_business_owner_permission.sql'));
  await db.exec(read('supabase/migrations/215_aggregate_business_analytics_metrics.sql'));
  if (apply249) await db.exec(read('supabase/migrations/249_analytics_metrics_authorization.sql'));
  return db;
};
const as = async (db, uid, { admin = false, role = 'authenticated' } = {}) => { await db.exec(`SET test.uid = '${uid ?? ''}'; SET test.admin = '${admin ? 'on' : 'off'}'; SET test.role = '${role}'`); };
const metrics = async (db, biz) => (await db.query(`SELECT public.get_business_analytics_aggregate_metrics($1::uuid, 30) AS r`, [biz])).rows[0].r;

console.log('Migration 249 · autorização das métricas (PGlite)');
const tenant = randomUUID(); const owner = randomUUID(); const stranger = randomUUID(); const member = randomUUID();
const biz = randomUUID(); const bizInactive = randomUUID();
const seed = async (db) => {
  await db.query(`INSERT INTO public.businesses (id, tenant_id, owner_id, is_active) VALUES ($1,$2,$3,true),($4,$2,$3,false)`, [biz, tenant, owner, bizInactive]);
  await db.query(`INSERT INTO public.business_members (tenant_id,business_id,user_id,role,status) VALUES ($1,$2,$3,'viewer','active')`, [tenant, biz, member]);
  for (let i = 0; i < 5; i += 1) await db.query(`INSERT INTO public.analytics_events (business_id, tenant_id, event_name, pseudonymous_subject_id) VALUES ($1,$2,'view',$3)`, [biz, tenant, 's' + i]);
};
const deniedWith = async (fn, re) => { try { await fn(); } catch (e) { if (re.test(e.message)) return; throw new Error('erro inesperado: ' + e.message); } throw new Error('deveria ter sido negado'); };

await ok('ANTES (215): qualquer usuário autenticado lê as métricas de outra empresa (reproduz a falha)', async () => {
  const db = await freshDb(false); await seed(db); await as(db, stranger);
  const r = await metrics(db, biz); eq(Boolean(r), true);
});
await ok('DEPOIS: o dono por owner_id, o membro da equipe e o admin do tenant continuam vendo', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, owner); eq(Boolean(await metrics(db, biz)), true);
  await as(db, member); eq(Boolean(await metrics(db, biz)), true);
  await as(db, stranger, { admin: true }); eq(Boolean(await metrics(db, biz)), true);
});
await ok('DEPOIS: usuário sem vínculo e anônimo são negados, e a mensagem não revela dados', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, stranger); await deniedWith(() => metrics(db, biz), /FORBIDDEN/);
  await as(db, null, { role: 'anon' }); await deniedWith(() => metrics(db, biz), /FORBIDDEN/);
});
await ok('DEPOIS: o servidor (service_role) continua podendo ler', async () => {
  const db = await freshDb(true); await seed(db); await as(db, null, { role: 'service_role' });
  eq(Boolean(await metrics(db, biz)), true);
});
await ok('empresa inativa e empresa inexistente continuam negadas', async () => {
  const db = await freshDb(true); await seed(db); await as(db, owner);
  await deniedWith(() => metrics(db, bizInactive), /FORBIDDEN/);
  await deniedWith(() => metrics(db, randomUUID()), /FORBIDDEN/);
});
await ok('os números devolvidos não mudam para quem tem acesso (mesmo corpo da função)', async () => {
  const before = await freshDb(false); await seed(before); await as(before, owner);
  const after = await freshDb(true); await seed(after); await as(after, owner);
  const a = await metrics(before, biz); const b = await metrics(after, biz);
  eq(a.kpis.views, 5); eq(b.kpis.views, 5);
  eq(Object.keys(a).sort(), Object.keys(b).sort());
});
await ok('rollback reabre como na 215 e a 249 pode ser reaplicada', async () => {
  const db = await freshDb(true); await seed(db); await as(db, stranger);
  await db.exec(read('supabase/rollbacks/connections/249_rollback.sql')); eq(Boolean(await metrics(db, biz)), true);
  await db.exec(read('supabase/migrations/249_analytics_metrics_authorization.sql'));
  await deniedWith(() => metrics(db, biz), /FORBIDDEN/);
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
