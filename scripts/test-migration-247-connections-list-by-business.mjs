// Mural de Conexões · migration 245 (public_connections_list) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas equivalentes às colunas lidas pela função; RLS/JWT reais não são exercitados.
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

// _normalize_search idêntica à da migration 055 (sem acento, minúsculas).
const m055 = read('supabase/migrations/055_directory_home_and_contracts.sql');
const nsStart = m055.indexOf('CREATE OR REPLACE FUNCTION public._normalize_search');
const nsEnd = m055.indexOf('$$;', m055.indexOf('AS $$', nsStart)) + 3;

const STUBS = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, name TEXT, slug TEXT, logo_url TEXT, publication_status TEXT, is_active BOOLEAN DEFAULT true);
  CREATE TABLE public.business_connections (
    id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID NOT NULL, member_user_id UUID,
    connection_type TEXT, item_description TEXT, message TEXT, photo_url TEXT, photo_moderation_status TEXT DEFAULT 'nao_requerida',
    status TEXT DEFAULT 'pendente', share_on_mural BOOLEAN DEFAULT false, confirmed_at TIMESTAMPTZ);
  CREATE TABLE public.connection_likes (connection_id UUID, user_id UUID);
  CREATE FUNCTION public._resolve_public_tenant_id(p_host TEXT) RETURNS UUID LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.tenant', true), '')::uuid $$;
  CREATE FUNCTION public._connection_member_first_name(p UUID) RETURNS TEXT LANGUAGE sql AS $$ SELECT 'Irmão' $$;
  ${m055.slice(nsStart, nsEnd)}
`;

async function freshDb() {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/migrations/245_public_connections_list.sql'));
  await db.exec(read('supabase/migrations/247_public_connections_list_by_business.sql'));
  return db;
}

const tenant = async (db) => { const t = randomUUID(); await db.exec(`SET test.tenant = '${t}'`); return t; };
const biz = async (db, t, o = {}) => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name, slug, logo_url, publication_status, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, t, o.name ?? `Empresa ${id.slice(0, 4)}`, o.slug ?? `e-${id.slice(0, 6)}`, o.logo ?? null, o.publication ?? 'published', o.active ?? true]);
  return id;
};
let seq = 0;
const conn = async (db, t, b, o = {}) => {
  const id = randomUUID(); seq += 1;
  await db.query(
    `INSERT INTO public.business_connections (id, tenant_id, business_id, member_user_id, connection_type, item_description, message, photo_url, photo_moderation_status, status, share_on_mural, confirmed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() - ($12 || ' minutes')::interval)`,
    [id, t, b, randomUUID(), o.type ?? 'compra', o.item ?? null, o.message ?? 'ok', o.photo ?? null, o.moderation ?? 'nao_requerida', o.status ?? 'confirmada', o.share ?? true, String(o.minutesAgo ?? seq)]);
  return id;
};
const list = async (db, o = {}) =>
  (await db.query(`SELECT public.public_connections_list('h', $1, $2, $3, $4, $5, $6) AS r`, [o.q ?? null, o.type ?? null, o.order ?? 'recent', o.page ?? 1, o.size ?? 12, o.slug ?? null])).rows[0].r;
const nargs = async (d) => (await d.query(`SELECT pronargs::int AS n FROM pg_proc WHERE proname='public_connections_list'`)).rows.map((r) => r.n);

console.log('MURAL DE CONEXÕES · Etapa 4 · listagem por empresa (migration 247, PGlite)');
const db = await freshDb();

await ok('só uma função public_connections_list existe (sem sobrecarga ambígua) e a de 6 argumentos foi substituída', async () => {
  eq(await nargs(db), [7]);
});
await ok('filtra pela empresa (slug) e conta o total daquela empresa', async () => {
  const t = await tenant(db);
  const a = await biz(db, t, { name: 'Ótica A', slug: 'otica-a' }); const b = await biz(db, t, { name: 'Padaria B', slug: 'padaria-b' });
  await conn(db, t, a, { message: 'a1' }); await conn(db, t, a, { message: 'a2' }); await conn(db, t, a, { message: 'a3' }); await conn(db, t, b, { message: 'b1' });
  const r = await list(db, { slug: 'otica-a', size: 2 });
  eq(r.total, 3); eq(r.items.length, 2); eq(r.total_pages, 2);
  eq(r.items.every((i) => i.business_slug === 'otica-a'), true);
  eq((await list(db)).total, 4);
  eq((await list(db, { slug: 'OTICA-A' })).total, 3);
});
await ok('slug inexistente: lista vazia (sem erro, sem revelar nada)', async () => {
  const r = await list(db, { slug: 'nao-existe' }); eq(r.total, 0); eq(r.items, []);
});
await ok('o filtro não amplia a visibilidade: empresa não publicada/inativa/outro tenant e conexões não elegíveis continuam fora', async () => {
  const t = await tenant(db);
  const draft = await biz(db, t, { slug: 'rascunho', publication: 'draft' }); await conn(db, t, draft);
  const off = await biz(db, t, { slug: 'inativa', active: false }); await conn(db, t, off);
  const good = await biz(db, t, { slug: 'boa' });
  await conn(db, t, good, { share: false }); await conn(db, t, good, { status: 'pendente' }); await conn(db, t, good, { status: 'recusada' }); await conn(db, t, good, { message: 'visivel' });
  const other = randomUUID(); const ob = await biz(db, other, { slug: 'boa' }); await conn(db, other, ob, { message: 'outro-tenant' });
  eq((await list(db, { slug: 'rascunho' })).total, 0); eq((await list(db, { slug: 'inativa' })).total, 0);
  eq((await list(db, { slug: 'boa' })).items.map((i) => i.message), ['visivel']);
});
await ok('combina com busca, tipo e ordem; foto só se aprovada', async () => {
  const t = await tenant(db); const a = await biz(db, t, { slug: 'combina' });
  await conn(db, t, a, { type: 'servico', item: 'óculos de grau', photo: 'https://x/rej.jpg', moderation: 'rejeitada', minutesAgo: 5 });
  await conn(db, t, a, { type: 'compra', item: 'lentes', photo: 'https://x/ok.jpg', moderation: 'aprovada', minutesAgo: 1 });
  eq((await list(db, { slug: 'combina', type: 'servico' })).total, 1);
  eq((await list(db, { slug: 'combina', q: 'OCULOS' })).total, 1);
  eq((await list(db, { slug: 'combina' })).items.map((i) => i.photo_url), ['https://x/ok.jpg', null]);
  eq((await list(db, { slug: 'combina', order: 'oldest' })).items[0].item_description, 'óculos de grau');
});
await ok('rollback volta à função de 6 argumentos da 245 e a 247 pode ser reaplicada', async () => {
  const d = await freshDb();
  await d.exec(read('supabase/rollbacks/connections/247_rollback.sql'));
  eq(await nargs(d), [6]);
  await d.exec(read('supabase/migrations/247_public_connections_list_by_business.sql'));
  eq(await nargs(d), [7]);
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
