// Migration 248 (has_business_permission reconhece businesses.owner_id) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas e has_tenant_admin_access simulada; RLS/JWT reais não são exercitados.
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
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_id UUID);
  CREATE TABLE public.business_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, business_id UUID, user_id UUID, role TEXT, status TEXT DEFAULT 'active');
  CREATE FUNCTION public.has_tenant_admin_access(p UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT current_setting('test.admin', true) = 'on' $$;
`;
// O rollback recria a versão ANTERIOR (migration 040): é o estado "antes".
const freshDb = async (apply248) => {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/rollbacks/connections/248_rollback.sql'));
  if (apply248) await db.exec(read('supabase/migrations/248_business_owner_permission.sql'));
  return db;
};
const as = async (db, uid, admin = false) => { await db.exec(`SET test.uid = '${uid ?? ''}'; SET test.admin = '${admin ? 'on' : 'off'}'`); };
const can = async (db, tenant, biz, roles) => (await db.query(`SELECT public.has_business_permission($1,$2,$3::text[]) AS r`, [tenant, biz, roles])).rows[0].r;
const ALL = ['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'];

console.log('Migration 248 · dono por owner_id (PGlite)');
const tenant = randomUUID(); const owner = randomUUID(); const other = randomUUID(); const biz = randomUUID(); const biz2 = randomUUID();
const seed = async (db) => {
  await db.query(`INSERT INTO public.businesses VALUES ($1,$2,$3),($4,$2,$5)`, [biz, tenant, owner, biz2, randomUUID()]);
};

await ok('ANTES: dono só por owner_id é negado (reproduz o erro "Sem permissão")', async () => {
  const db = await freshDb(false); await seed(db); await as(db, owner);
  eq(await can(db, tenant, biz, ALL), false);
});
await ok('DEPOIS: o dono por owner_id é aceito na própria empresa quando o papel owner está na lista', async () => {
  const db = await freshDb(true); await seed(db); await as(db, owner);
  eq(await can(db, tenant, biz, ALL), true);
  eq(await can(db, tenant, biz, ['owner', 'co_owner', 'manager']), true);
});
await ok('não vaza: outra empresa, outro usuário, outro tenant, sem login e papéis sem owner continuam negados', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, owner);
  eq(await can(db, tenant, biz2, ALL), false, 'outra empresa');
  eq(await can(db, randomUUID(), biz, ALL), false, 'tenant diferente');
  eq(await can(db, tenant, biz, ['manager', 'viewer']), false, 'lista sem owner');
  eq(await can(db, null, biz, ALL), false);
  eq(await can(db, tenant, null, ALL), false);
  await as(db, other); eq(await can(db, tenant, biz, ALL), false, 'outro usuário');
  await as(db, null); eq(await can(db, tenant, biz, ALL), false, 'sem login');
});
await ok('comportamento anterior preservado: admin do tenant e business_members ativos com papel permitido', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, other, true); eq(await can(db, tenant, biz, ['viewer']), true, 'admin');
  await as(db, other, false);
  await db.query(`INSERT INTO public.business_members (tenant_id,business_id,user_id,role,status) VALUES ($1,$2,$3,'manager','active')`, [tenant, biz, other]);
  eq(await can(db, tenant, biz, ['owner', 'manager']), true, 'membro ativo');
  eq(await can(db, tenant, biz, ['owner', 'finance']), false, 'papel fora da lista');
  await db.query(`UPDATE public.business_members SET status='revoked'`);
  eq(await can(db, tenant, biz, ['owner', 'manager']), false, 'membro revogado');
});
await ok('trocar o owner_id muda quem tem acesso (o antigo dono perde)', async () => {
  const db = await freshDb(true); await seed(db); await as(db, owner);
  eq(await can(db, tenant, biz, ALL), true);
  await db.query(`UPDATE public.businesses SET owner_id = $1 WHERE id = $2`, [other, biz]);
  eq(await can(db, tenant, biz, ALL), false);
  await as(db, other); eq(await can(db, tenant, biz, ALL), true);
});
await ok('rollback volta ao comportamento anterior e a migration pode ser reaplicada', async () => {
  const db = await freshDb(true); await seed(db); await as(db, owner);
  await db.exec(read('supabase/rollbacks/connections/248_rollback.sql'));
  eq(await can(db, tenant, biz, ALL), false);
  await db.exec(read('supabase/migrations/248_business_owner_permission.sql'));
  eq(await can(db, tenant, biz, ALL), true);
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
