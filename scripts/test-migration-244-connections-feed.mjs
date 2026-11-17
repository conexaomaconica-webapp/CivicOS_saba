// Mural de Conexões · migration 244 (public_connections_feed com p_one_per_business) em PostgreSQL real (PGlite).
// LIMITES: o cenário usa tabelas mínimas equivalentes às colunas lidas pela função; RLS/JWT reais não são exercitados.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
const failures = [];
async function ok(name, fn) {
  try { await fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failed += 1; failures.push(`${name}: ${e.message}`); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
const eq = (a, b, l = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${l} esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)}`); };

const STUBS = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, name TEXT, slug TEXT, publication_status TEXT, is_active BOOLEAN DEFAULT true);
  CREATE TABLE public.business_connections (
    id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID NOT NULL, member_user_id UUID,
    connection_type TEXT, item_description TEXT, message TEXT, photo_url TEXT, photo_moderation_status TEXT DEFAULT 'nao_requerida',
    status TEXT DEFAULT 'pendente', share_on_mural BOOLEAN DEFAULT false, confirmed_at TIMESTAMPTZ);
  CREATE TABLE public.connection_likes (connection_id UUID, user_id UUID);
  CREATE FUNCTION public._resolve_public_tenant_id(p_host TEXT) RETURNS UUID LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.tenant', true), '')::uuid $$;
  CREATE FUNCTION public._connection_member_first_name(p UUID) RETURNS TEXT LANGUAGE sql AS $$ SELECT 'Irmão' $$;
`;

async function freshDb() {
  const db = new PGlite();
  await db.exec(STUBS);
  // Função ANTIGA (3 argumentos) da migration 184, para exercitar a substituição.
  const m184 = read('supabase/migrations/184_mural_share_consent.sql');
  const s = m184.indexOf('CREATE OR REPLACE FUNCTION public.public_connections_feed');
  const e = m184.indexOf('GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN)');
  await db.exec(m184.slice(s, e));
  await db.exec(read('supabase/migrations/244_connections_feed_one_per_business.sql'));
  return db;
}

const tenant = async (db) => { const t = randomUUID(); await db.exec(`SET test.tenant = '${t}'`); return t; };
const biz = async (db, t, o = {}) => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name, slug, publication_status, is_active) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, t, o.name ?? `Empresa ${id.slice(0, 4)}`, o.slug ?? `e-${id.slice(0, 6)}`, o.publication ?? 'published', o.active ?? true]);
  return id;
};
let minutes = 0;
const conn = async (db, t, b, o = {}) => {
  const id = randomUUID(); minutes += 1;
  await db.query(
    `INSERT INTO public.business_connections (id, tenant_id, business_id, member_user_id, connection_type, message, photo_url, photo_moderation_status, status, share_on_mural, confirmed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now() - ($11 || ' minutes')::interval)`,
    [id, t, b, randomUUID(), o.type ?? 'compra', o.message ?? 'ok', o.photo ?? null, o.moderation ?? 'nao_requerida', o.status ?? 'confirmada', o.share ?? true, String(o.minutesAgo ?? minutes)]);
  return id;
};
const feed = async (db, limit, onePer = false, withPhoto = false, preferPhoto = true) =>
  (await db.query(`SELECT public.public_connections_feed('h', $1, $2, $3, $4) AS r`, [limit, withPhoto, onePer, preferPhoto])).rows[0].r;

console.log('================================================================');
console.log('MURAL DE CONEXÕES · FEED COM 1 POR EMPRESA (migration 244, PGlite)');
console.log('================================================================');

const db = await freshDb();

console.log('\n[1] Diversidade por empresa (na consulta)');
await ok('várias conexões da mesma empresa: 1 por empresa, e chega a 3 empresas distintas', async () => {
  const t = await tenant(db);
  const a = await biz(db, t), b = await biz(db, t), c = await biz(db, t), d = await biz(db, t);
  // A empresa A domina as 4 mais recentes; B, C e D só têm conexões mais antigas.
  for (let i = 1; i <= 4; i += 1) await conn(db, t, a, { minutesAgo: i });
  await conn(db, t, b, { minutesAgo: 50 }); await conn(db, t, c, { minutesAgo: 60 }); await conn(db, t, d, { minutesAgo: 70 });
  const result = await feed(db, 3, true);
  eq(result.length, 3, 'tamanho');
  eq(new Set(result.map((r) => r.business_slug)).size, 3, 'empresas distintas');
  // Sem a opção (comportamento atual) as 3 mais recentes seriam todas da empresa A.
  eq(new Set((await feed(db, 3, false)).map((r) => r.business_slug)).size, 1, 'padrão inalterado');
});
await ok('a conexão escolhida de cada empresa é a com foto aprovada, depois a mais recente', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  const recent = await conn(db, t, a, { minutesAgo: 1 });
  const withPhoto = await conn(db, t, a, { minutesAgo: 500, photo: 'https://x/foto.jpg', moderation: 'aprovada' });
  const result = await feed(db, 3, true);
  eq(result.length, 1); eq(result[0].id, withPhoto, 'foto aprovada primeiro'); void recent;
});
await ok('menos empresas que o limite: devolve só as elegíveis (sem repetir nem inventar)', async () => {
  const t = await tenant(db); const a = await biz(db, t), b = await biz(db, t);
  for (let i = 1; i <= 5; i += 1) { await conn(db, t, a, {}); await conn(db, t, b, {}); }
  eq((await feed(db, 3, true)).length, 2);
});
await ok('zero, um e dois registros', async () => {
  const t = await tenant(db);
  eq(await feed(db, 3, true), [], 'zero');
  const a = await biz(db, t); await conn(db, t, a);
  eq((await feed(db, 3, true)).length, 1, 'um');
  const b = await biz(db, t); await conn(db, t, b);
  eq((await feed(db, 3, true)).length, 2, 'dois');
});

await ok('p_prefer_photo=false (vitrines compactas): só a mais recente, mesmo sem foto; padrão continua foto primeiro', async () => {
  const t = await tenant(db);
  const a = await biz(db, t), b = await biz(db, t);
  const oldPhoto = await conn(db, t, a, { minutesAgo: 900, photo: 'https://x/velha.jpg', moderation: 'aprovada' });
  const newNoPhoto = await conn(db, t, a, { minutesAgo: 1 });
  const bRecent = await conn(db, t, b, { minutesAgo: 5 });
  const recent = await feed(db, 3, true, false, false);
  eq(recent.map((r) => r.id), [newNoPhoto, bRecent], 'recência: a mais nova de cada empresa, em ordem cronológica');
  const withPhotoFirst = await feed(db, 3, true, false, true);
  eq(withPhotoFirst[0].id, oldPhoto, 'padrão: foto aprovada primeiro');
});

console.log('\n[2] Visibilidade (regras inalteradas)');
await ok('exclui: sem consentimento, não confirmada, empresa inativa/não publicada, outro tenant', async () => {
  const t = await tenant(db);
  const good = await biz(db, t); await conn(db, t, good, { message: 'visivel' });
  const noConsent = await biz(db, t); await conn(db, t, noConsent, { share: false });
  const pending = await biz(db, t); await conn(db, t, pending, { status: 'pendente' });
  const refused = await biz(db, t); await conn(db, t, refused, { status: 'recusada' });
  const removed = await biz(db, t); await conn(db, t, removed, { status: 'removida' });
  const inactive = await biz(db, t, { active: false }); await conn(db, t, inactive);
  const draft = await biz(db, t, { publication: 'draft' }); await conn(db, t, draft);
  const other = randomUUID(); const otherBiz = await biz(db, other); await conn(db, other, otherBiz);
  for (const onePer of [true, false]) {
    const r = await feed(db, 24, onePer);
    eq(r.map((x) => x.message), ['visivel'], `onePer=${onePer}`);
  }
});
await ok('foto bloqueada ou pendente de moderação nunca é exposta', async () => {
  const t = await tenant(db); const a = await biz(db, t); const b = await biz(db, t); const c = await biz(db, t);
  await conn(db, t, a, { photo: 'https://x/a.jpg', moderation: 'rejeitada' });
  await conn(db, t, b, { photo: 'https://x/b.jpg', moderation: 'pendente' });
  await conn(db, t, c, { photo: 'https://x/c.jpg', moderation: 'aprovada' });
  const r = await feed(db, 24, true);
  eq(r.filter((x) => x.photo_url).map((x) => x.photo_url), ['https://x/c.jpg']);
});
await ok('somente com foto aprovada continua funcionando junto com 1 por empresa', async () => {
  const t = await tenant(db); const a = await biz(db, t); const b = await biz(db, t);
  await conn(db, t, a, { photo: 'https://x/a.jpg', moderation: 'aprovada' }); await conn(db, t, a, { photo: 'https://x/a2.jpg', moderation: 'aprovada' });
  await conn(db, t, b);
  const r = await feed(db, 24, true, true);
  eq(r.length, 1);
});
await ok('o limite do banco (24) e o mínimo (1) continuam valendo', async () => {
  const t = await tenant(db);
  for (let i = 0; i < 30; i += 1) { const x = await biz(db, t); await conn(db, t, x); }
  eq((await feed(db, 999, true)).length, 24);
  eq((await feed(db, 0, true)).length, 1);
});

console.log('\n[3] Compatibilidade e permissões');
await ok('o app publicado (3 argumentos) continua idêntico ao comportamento anterior', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  for (let i = 0; i < 4; i += 1) await conn(db, t, a);
  const r = (await db.query(`SELECT public.public_connections_feed('h', 6, false) AS r`)).rows[0].r;
  eq(r.length, 4);
});
await ok('só uma função com esse nome (sem sobrecarga ambígua) e acessível a anon/authenticated', async () => {
  eq((await db.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='public_connections_feed'`)).rows[0].n, 1);
  for (const role of ['anon', 'authenticated']) {
    eq((await db.query(`SELECT has_function_privilege($1,'public.public_connections_feed(text,integer,boolean,boolean,boolean)','EXECUTE') AS p`, [role])).rows[0].p, true, role);
  }
});
await ok('o rollback restaura a função de 3 argumentos', async () => {
  const d = await freshDb();
  await d.exec(read('supabase/rollbacks/connections/244_rollback.sql'));
  eq((await d.query(`SELECT pronargs::int AS n FROM pg_proc WHERE proname='public_connections_feed'`)).rows[0].n, 3);
});

console.log('\n================================================================');
console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
