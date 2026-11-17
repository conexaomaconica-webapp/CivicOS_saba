// Mural de Conexões · migration 246 (public_connection_detail) em PostgreSQL real (PGlite).
// LIMITES: tabelas mínimas equivalentes às colunas lidas pela função; RLS/JWT reais e PostgREST não são exercitados.
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
  CREATE TABLE public.businesses (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, name TEXT, slug TEXT, logo_url TEXT, publication_status TEXT, is_active BOOLEAN DEFAULT true);
  CREATE TABLE public.business_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, business_id UUID NOT NULL, member_user_id UUID,
    connection_type TEXT, item_description TEXT, message TEXT, photo_url TEXT, photo_moderation_status TEXT DEFAULT 'nao_requerida',
    status TEXT DEFAULT 'pendente', share_on_mural BOOLEAN DEFAULT false, confirmed_at TIMESTAMPTZ DEFAULT now());
  CREATE FUNCTION public._resolve_public_tenant_id(p_host TEXT) RETURNS UUID LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.tenant', true), '')::uuid $$;
  CREATE FUNCTION public._connection_member_first_name(p UUID) RETURNS TEXT LANGUAGE sql AS $$ SELECT 'Irmão' $$;
`;
const freshDb = async () => { const db = new PGlite(); await db.exec(STUBS); await db.exec(read('supabase/migrations/246_public_connection_detail.sql')); return db; };

const tenant = async (db) => { const t = randomUUID(); await db.exec(`SET test.tenant = '${t}'`); return t; };
const biz = async (db, t, o = {}) => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name, slug, logo_url, publication_status, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, t, o.name ?? 'Padaria Central', o.slug ?? `e-${id.slice(0, 6)}`, o.logo ?? null, o.publication ?? 'published', o.active ?? true]);
  return id;
};
const conn = async (db, t, b, o = {}) => {
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.business_connections (id, tenant_id, business_id, member_user_id, connection_type, item_description, message, photo_url, photo_moderation_status, status, share_on_mural)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, t, b, randomUUID(), o.type ?? 'parceria', o.item ?? null, o.message ?? 'Ótima parceria', o.photo ?? null, o.moderation ?? 'nao_requerida', o.status ?? 'confirmada', o.share ?? true]);
  return id;
};
const detail = async (db, id) => (await db.query(`SELECT public.public_connection_detail('h', $1) AS r`, [id])).rows[0].r;

console.log('================================================================');
console.log('MURAL DE CONEXÕES · PÁGINA INDIVIDUAL (migration 246, PGlite)');
console.log('================================================================');
const db = await freshDb();

console.log('\n[1] Conteúdo público elegível');
await ok('devolve somente campos públicos da conexão elegível', async () => {
  const t = await tenant(db); const b = await biz(db, t, { name: 'Ótica Central', slug: 'otica-central', logo: 'https://x/logo.png' });
  const id = await conn(db, t, b, { type: 'servico', item: 'óculos de grau', message: 'Atendimento excelente' });
  const r = await detail(db, id);
  eq(Object.keys(r).sort(), ['business_logo_url', 'business_name', 'business_slug', 'confirmed_at', 'connection_type', 'id', 'item_description', 'member_first_name', 'message', 'photo_url']);
  eq([r.id, r.business_name, r.business_slug, r.connection_type, r.member_first_name], [id, 'Ótica Central', 'otica-central', 'servico', 'Irmão']);
});
await ok('foto: só quando APROVADA (rejeitada, pendente ou não requerida nunca é exposta)', async () => {
  const t = await tenant(db); const b = await biz(db, t);
  const okId = await conn(db, t, b, { photo: 'https://x/ok.jpg', moderation: 'aprovada' });
  eq((await detail(db, okId)).photo_url, 'https://x/ok.jpg');
  for (const moderation of ['rejeitada', 'pendente', 'nao_requerida']) {
    const id = await conn(db, t, b, { photo: 'https://x/nao.jpg', moderation });
    eq((await detail(db, id)).photo_url, null, moderation);
  }
});

console.log('\n[2] Exclusões (devolvem NULL → a página responde 404)');
await ok('pendente, recusada ou removida', async () => {
  const t = await tenant(db); const b = await biz(db, t);
  for (const status of ['pendente', 'recusada', 'removida']) eq(await detail(db, await conn(db, t, b, { status })), null, status);
});
await ok('sem consentimento para o Mural', async () => {
  const t = await tenant(db); const b = await biz(db, t);
  eq(await detail(db, await conn(db, t, b, { share: false })), null);
});
await ok('revogação: o mesmo registro deixa de ser acessível quando o consentimento é retirado, é removido ou a empresa é despublicada', async () => {
  const t = await tenant(db); const b = await biz(db, t); const id = await conn(db, t, b);
  if (!(await detail(db, id))) throw new Error('deveria estar acessível antes');
  await db.query(`UPDATE public.business_connections SET share_on_mural=false WHERE id=$1`, [id]);
  eq(await detail(db, id), null, 'consentimento retirado');
  await db.query(`UPDATE public.business_connections SET share_on_mural=true WHERE id=$1`, [id]);
  if (!(await detail(db, id))) throw new Error('volta a ficar acessível ao restabelecer');
  await db.query(`UPDATE public.business_connections SET status='removida' WHERE id=$1`, [id]);
  eq(await detail(db, id), null, 'removida');
  await db.query(`UPDATE public.business_connections SET status='confirmada' WHERE id=$1`, [id]);
  await db.query(`UPDATE public.businesses SET publication_status='draft' WHERE id=$1`, [b]);
  eq(await detail(db, id), null, 'empresa despublicada');
  await db.query(`UPDATE public.businesses SET publication_status='published', is_active=false WHERE id=$1`, [b]);
  eq(await detail(db, id), null, 'empresa inativa');
});
await ok('empresa inativa/não publicada desde o início', async () => {
  const t = await tenant(db);
  eq(await detail(db, await conn(db, t, await biz(db, t, { active: false }))), null);
  eq(await detail(db, await conn(db, t, await biz(db, t, { publication: 'draft' }))), null);
});
await ok('outro tenant, id inexistente, id nulo e domínio sem ambiente resolvido', async () => {
  const t = await tenant(db); const b = await biz(db, t); const id = await conn(db, t, b);
  const other = randomUUID(); const ob = await biz(db, other); const otherId = await conn(db, other, ob);
  eq(await detail(db, otherId), null, 'conexão de outro tenant');
  eq(await detail(db, randomUUID()), null, 'inexistente');
  eq(await detail(db, null), null, 'nulo');
  await db.exec(`SET test.tenant = ''`);
  eq(await detail(db, id), null, 'sem tenant');
});
await ok('o identificador é um UUID v4 aleatório (não sequencial)', async () => {
  const t = await tenant(db); const b = await biz(db, t);
  const ids = []; for (let i = 0; i < 20; i += 1) ids.push(await conn(db, t, b));
  for (const id of ids) if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error(`não é UUID v4: ${id}`);
  eq(new Set(ids).size, 20);
});

console.log('\n[3] Permissões e rollback');
await ok('acessível a anon/authenticated e é a única função com esse nome', async () => {
  for (const role of ['anon', 'authenticated']) {
    eq((await db.query(`SELECT has_function_privilege($1,'public.public_connection_detail(text,uuid)','EXECUTE') AS p`, [role])).rows[0].p, true, role);
  }
  eq((await db.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='public_connection_detail'`)).rows[0].n, 1);
});
await ok('re-execução idempotente e rollback remove a função', async () => {
  const d = await freshDb();
  await d.exec(read('supabase/migrations/246_public_connection_detail.sql'));
  await d.exec(read('supabase/rollbacks/connections/246_rollback.sql'));
  eq((await d.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='public_connection_detail'`)).rows[0].n, 0);
});

console.log('\n================================================================');
console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
