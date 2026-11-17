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
  (await db.query(`SELECT public.public_connections_list('h', $1, $2, $3, $4, $5) AS r`, [o.q ?? null, o.type ?? null, o.order ?? 'recent', o.page ?? 1, o.size ?? 12])).rows[0].r;

console.log('================================================================');
console.log('MURAL DE CONEXÕES · LISTAGEM PÚBLICA /conexoes (migration 245, PGlite)');
console.log('================================================================');

const db = await freshDb();

console.log('\n[1] Visibilidade (mesmas regras do feed)');
await ok('exclui: sem consentimento, não confirmada, recusada/removida, empresa inativa/não publicada, outro tenant', async () => {
  const t = await tenant(db);
  const good = await biz(db, t); await conn(db, t, good, { message: 'visivel' });
  const x1 = await biz(db, t); await conn(db, t, x1, { share: false });
  const x2 = await biz(db, t); await conn(db, t, x2, { status: 'pendente' });
  const x3 = await biz(db, t); await conn(db, t, x3, { status: 'recusada' });
  const x4 = await biz(db, t); await conn(db, t, x4, { status: 'removida' });
  const x5 = await biz(db, t, { active: false }); await conn(db, t, x5);
  const x6 = await biz(db, t, { publication: 'draft' }); await conn(db, t, x6);
  const other = randomUUID(); const ob = await biz(db, other); await conn(db, other, ob);
  const r = await list(db);
  eq(r.items.map((i) => i.message), ['visivel']); eq(r.total, 1);
});
await ok('foto só quando aprovada; rejeitada/pendente nunca é exposta', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  await conn(db, t, a, { photo: 'https://x/ok.jpg', moderation: 'aprovada' });
  await conn(db, t, a, { photo: 'https://x/rej.jpg', moderation: 'rejeitada' });
  await conn(db, t, a, { photo: 'https://x/pen.jpg', moderation: 'pendente' });
  const photos = (await list(db)).items.map((i) => i.photo_url).filter(Boolean);
  eq(photos, ['https://x/ok.jpg']);
});
await ok('não devolve dados internos (só campos públicos)', async () => {
  const t = await tenant(db); const a = await biz(db, t, { logo: 'https://x/logo.png' }); await conn(db, t, a);
  const item = (await list(db)).items[0];
  eq(Object.keys(item).sort(), ['business_logo_url', 'business_name', 'business_slug', 'confirmed_at', 'connection_type', 'id', 'item_description', 'like_count', 'liked_by_me', 'member_first_name', 'message', 'photo_url']);
  eq(item.business_logo_url, 'https://x/logo.png');
});

console.log('\n[2] Busca e filtros');
await ok('busca por empresa, item e mensagem, sem acento e sem diferenciar maiúsculas', async () => {
  const t = await tenant(db);
  const padaria = await biz(db, t, { name: 'Padaria São José' });
  const otica = await biz(db, t, { name: 'Ótica Central' });
  await conn(db, t, padaria, { item: 'pães artesanais', message: 'Atendimento excelente' });
  await conn(db, t, otica, { item: 'óculos de grau', message: 'Parceria duradoura' });
  eq((await list(db, { q: 'sao jose' })).items.map((i) => i.business_name), ['Padaria São José'], 'empresa sem acento');
  eq((await list(db, { q: 'OTICA' })).items.map((i) => i.business_name), ['Ótica Central'], 'maiúsculas');
  eq((await list(db, { q: 'paes' })).items.length, 1, 'item sem acento');
  eq((await list(db, { q: 'duradoura' })).items.map((i) => i.business_name), ['Ótica Central'], 'mensagem');
  eq((await list(db, { q: 'inexistente' })).total, 0, 'sem resultado');
});
await ok('curingas do LIKE são tratados como texto comum (sem vazar tudo)', async () => {
  const t = await tenant(db); const a = await biz(db, t, { name: 'Alfa' }); await conn(db, t, a, { message: 'comum' });
  eq((await list(db, { q: '%' })).total, 0); eq((await list(db, { q: '_' })).total, 0);
});
await ok('filtro por tipo; tipo inválido é ignorado (não derruba nem expõe mais)', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  await conn(db, t, a, { type: 'compra' }); await conn(db, t, a, { type: 'servico' }); await conn(db, t, a, { type: 'parceria' }); await conn(db, t, a, { type: 'visita' }); await conn(db, t, a, { type: 'visita' });
  eq((await list(db, { type: 'visita' })).total, 2); eq((await list(db, { type: 'parceria' })).total, 1);
  eq((await list(db, { type: 'qualquer' })).total, 5, 'inválido = sem filtro');
  eq((await list(db, { type: 'visita', q: 'ok' })).total, 2, 'tipo + busca');
});
await ok('consulta é aparada e limitada a 80 caracteres', async () => {
  const t = await tenant(db); const a = await biz(db, t, { name: 'Alfa' }); await conn(db, t, a);
  eq((await list(db, { q: '   alfa   ' })).total, 1);
  eq((await list(db, { q: 'x'.repeat(500) })).total, 0);
});

console.log('\n[3] Ordem e paginação no servidor');
await ok('ordem cronológica: mais recentes (padrão) e mais antigas', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  const old = await conn(db, t, a, { minutesAgo: 500 }); const mid = await conn(db, t, a, { minutesAgo: 100 }); const recent = await conn(db, t, a, { minutesAgo: 1 });
  eq((await list(db)).items.map((i) => i.id), [recent, mid, old]);
  eq((await list(db, { order: 'oldest' })).items.map((i) => i.id), [old, mid, recent]);
  eq((await list(db, { order: 'qualquer' })).items.map((i) => i.id), [recent, mid, old], 'ordem inválida = padrão');
});
await ok('paginação: total, total_pages, páginas sem repetição e página além do fim', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  for (let i = 0; i < 25; i += 1) await conn(db, t, a, { minutesAgo: i + 1, message: `m${i}` });
  const p1 = await list(db, { page: 1, size: 10 }), p2 = await list(db, { page: 2, size: 10 }), p3 = await list(db, { page: 3, size: 10 });
  eq([p1.total, p1.total_pages, p1.page_size, p1.items.length, p2.items.length, p3.items.length], [25, 3, 10, 10, 10, 5]);
  const ids = [...p1.items, ...p2.items, ...p3.items].map((i) => i.id);
  eq(new Set(ids).size, 25, 'sem repetição entre páginas');
  const beyond = await list(db, { page: 9, size: 10 });
  eq([beyond.items.length, beyond.total, beyond.total_pages, beyond.page], [0, 25, 3, 9]);
});
await ok('limites: tamanho máximo 24, mínimo 1; página mínima 1', async () => {
  const t = await tenant(db); const a = await biz(db, t);
  for (let i = 0; i < 30; i += 1) await conn(db, t, a);
  eq((await list(db, { size: 999 })).items.length, 24); eq((await list(db, { size: 0 })).items.length, 1); eq((await list(db, { page: -4 })).page, 1);
});
await ok('zero registros: lista vazia, total 0 e nenhuma página', async () => {
  await tenant(db);
  const r0 = await list(db); eq([r0.items, r0.total, r0.page, r0.page_size, r0.total_pages], [[], 0, 1, 12, 0]);
});
await ok('domínio sem ambiente resolvido: resposta vazia segura', async () => {
  await db.exec(`SET test.tenant = ''`);
  const r = await list(db);
  eq([r.items.length, r.total, r.total_pages], [0, 0, 0]);
});

console.log('\n[4] Permissões e rollback');
await ok('acessível a anon/authenticated e é a única função com esse nome', async () => {
  for (const role of ['anon', 'authenticated']) {
    eq((await db.query(`SELECT has_function_privilege($1,'public.public_connections_list(text,text,text,text,integer,integer)','EXECUTE') AS p`, [role])).rows[0].p, true, role);
  }
  eq((await db.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='public_connections_list'`)).rows[0].n, 1);
});
await ok('re-execução é idempotente e o rollback remove a função', async () => {
  const d = await freshDb();
  await d.exec(read('supabase/migrations/245_public_connections_list.sql'));
  await d.exec(read('supabase/rollbacks/connections/245_rollback.sql'));
  eq((await d.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='public_connections_list'`)).rows[0].n, 0);
});

console.log('\n================================================================');
console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
