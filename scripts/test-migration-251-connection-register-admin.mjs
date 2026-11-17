// Migration 251 (admin/master sem vínculo pode registrar conexão) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas equivalentes às colunas usadas; has_tenant_admin_access simulada; RLS/JWT reais não são exercitados.
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
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_id UUID, name TEXT, publication_status TEXT DEFAULT 'published', is_active BOOLEAN DEFAULT true);
  CREATE TABLE public.business_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, business_id UUID, user_id UUID, role TEXT, status TEXT DEFAULT 'active');
  CREATE TABLE public.business_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID, business_id UUID, member_user_id UUID, connection_type TEXT,
    item_description TEXT, message TEXT, photo_url TEXT, origin TEXT, value_range TEXT, share_on_mural BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pendente', created_at TIMESTAMPTZ DEFAULT now());
  -- Administrador do tenant simulado por configuração: é exatamente o que fazia has_business_permission bloquear todo master.
  CREATE FUNCTION public.has_tenant_admin_access(p UUID) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT current_setting('test.admin', true) = 'on' $$;
`;
const freshDb = async (apply251) => {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/migrations/248_business_owner_permission.sql')); // has_business_permission com owner_id
  await db.exec(read('supabase/rollbacks/connections/251_rollback.sql')); // função ORIGINAL (184) = estado "antes"
  if (apply251) await db.exec(read('supabase/migrations/251_connection_register_admin_without_link.sql'));
  return db;
};
const as = async (db, uid, admin = false) => { await db.exec(`SET test.uid = '${uid}'; SET test.admin = '${admin ? 'on' : 'off'}'`); };
const register = (db, biz, type = 'compra') => db.query(`SELECT public.register_business_connection($1::uuid, $2) AS r`, [biz, type]);
const denied = async (fn, re) => { try { await fn(); } catch (e) { if (re.test(e.message)) return; throw new Error('erro inesperado: ' + e.message); } throw new Error('deveria ter sido negado'); };
const FORBIDDEN = /faz parte desta empresa/;

const tenant = randomUUID();
const owner = randomUUID(), plain = randomUUID(), master = randomUUID(), masterOwner = randomUUID(), masterTeam = randomUUID();
const team = randomUUID(), revoked = randomUUID();
const biz = randomUUID(), bizOfMasterOwner = randomUUID();
const seed = async (db) => {
  await db.query(`INSERT INTO public.businesses (id, tenant_id, owner_id, name) VALUES ($1,$2,$3,'Óptica'),($4,$2,$5,'Loja do Master')`, [biz, tenant, owner, bizOfMasterOwner, masterOwner]);
  await db.query(`INSERT INTO public.business_members (tenant_id, business_id, user_id, role, status) VALUES
    ($1,$2,$3,'manager','active'), ($1,$2,$4,'viewer','revoked'), ($1,$2,$5,'support','active')`, [tenant, biz, team, revoked, masterTeam]);
};

console.log('Migration 251 · admin/master sem vínculo registra conexão (PGlite)');

await ok('ANTES (184): master sem vínculo é bloqueado (reproduz o erro), assim como dono e equipe; usuário comum registra', async () => {
  const db = await freshDb(false); await seed(db);
  await as(db, master, true); await denied(() => register(db, biz), FORBIDDEN);
  await as(db, owner); await denied(() => register(db, biz), FORBIDDEN);
  await as(db, team); await denied(() => register(db, biz), FORBIDDEN);
  await as(db, plain); eq((await register(db, biz)).rows[0].r.status, 'pendente');
});
await ok('DEPOIS: master/admin SEM vínculo com a empresa registra, e a conexão nasce pendente (não é confirmada sozinha)', async () => {
  const db = await freshDb(true); await seed(db); await as(db, master, true);
  const r = (await register(db, biz)).rows[0].r;
  eq(r.status, 'pendente'); eq(r.business_name, 'Óptica');
  const row = (await db.query(`SELECT member_user_id, status FROM public.business_connections WHERE id = $1`, [r.id])).rows[0];
  eq(row.member_user_id, master); eq(row.status, 'pendente');
});
await ok('DEPOIS: dono continua bloqueado, mesmo sendo master (o caso da Óptica Circulô)', async () => {
  const db = await freshDb(true); await seed(db); await as(db, masterOwner, true);
  await denied(() => register(db, bizOfMasterOwner), FORBIDDEN);
  await as(db, owner, false); await denied(() => register(db, biz), FORBIDDEN);
});
await ok('DEPOIS: equipe ativa continua bloqueada (qualquer papel), inclusive se for master; equipe revogada não conta como equipe', async () => {
  const db = await freshDb(true); await seed(db);
  await as(db, team); await denied(() => register(db, biz), FORBIDDEN);
  await as(db, masterTeam, true); await denied(() => register(db, biz), FORBIDDEN);
  await as(db, revoked); eq((await register(db, biz)).rows[0].r.status, 'pendente');
});
await ok('DEPOIS: o master bloqueado em uma empresa pode registrar em outra onde não tem vínculo', async () => {
  const db = await freshDb(true); await seed(db); await as(db, masterOwner, true);
  await denied(() => register(db, bizOfMasterOwner), FORBIDDEN);
  eq((await register(db, biz)).rows[0].r.status, 'pendente');
});
await ok('regras do resto da função inalteradas: duplicidade pendente, empresa inexistente, sem login e tipo inválido', async () => {
  const db = await freshDb(true); await seed(db); await as(db, master, true);
  await register(db, biz);
  await denied(() => register(db, biz), /DUPLICATE/);
  await denied(() => register(db, randomUUID()), /BUSINESS_NOT_FOUND/);
  await denied(() => register(db, biz, 'invalido'), /INVALID_TYPE/);
  await db.exec(`SET test.uid = ''`); await denied(() => register(db, biz, 'servico'), /UNAUTHORIZED/);
});
await ok('rollback volta ao bloqueio do master e a 251 pode ser reaplicada', async () => {
  const db = await freshDb(true); await seed(db);
  await db.exec(read('supabase/rollbacks/connections/251_rollback.sql'));
  await as(db, master, true); await denied(() => register(db, biz), FORBIDDEN);
  await db.exec(read('supabase/migrations/251_connection_register_admin_without_link.sql'));
  eq((await register(db, biz)).rows[0].r.status, 'pendente');
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
