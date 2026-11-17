// Migration 252 (get_admin_lodges_list corrigida) em PostgreSQL real (PGlite).
// LIMITES: a tabela organizations do teste só tem as colunas lidas pela função + contact_email (conforme o banco oficial, que não tem
// phone nem email); o esquema real não foi lido diretamente (sem acesso ao projeto pelo assistente). RLS/JWT reais não são exercitados.
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
const denied = async (fn, re) => { try { await fn(); } catch (e) { if (re.test(e.message)) return; throw new Error('erro inesperado: ' + e.message); } throw new Error('deveria ter falhado'); };

const STUBS = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role', true), '') $$;
  CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, slug TEXT, code_number INTEGER, potency TEXT, rite TEXT, city TEXT, state TEXT,
    address TEXT, meeting_schedule TEXT, contact_email TEXT, emblem_url TEXT, latitude NUMERIC, longitude NUMERIC,
    is_active BOOLEAN DEFAULT true, provenance TEXT, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE public.organization_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID, type TEXT, value TEXT, sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
`;
// O rollback recria a função como estava na 250 (com o defeito): é o estado "antes".
const freshDb = async (apply252) => {
  const db = new PGlite();
  await db.exec(STUBS);
  await db.exec(read('supabase/rollbacks/connections/252_rollback.sql'));
  if (apply252) await db.exec(read('supabase/migrations/252_fix_admin_lodges_list.sql'));
  return db;
};
const as = (db, role) => db.exec(`SET test.role = '${role}'`);
const list = async (db, o = {}) => (await db.query(
  `SELECT public.get_admin_lodges_list($1,$2,$3,$4,$5,$6,$7,$8) AS r`,
  [o.q ?? null, o.state ?? null, o.potency ?? null, o.status ?? null, o.coords ?? false, o.emblem ?? false, o.page ?? 1, o.size ?? 10])).rows[0].r;
let n = 0;
const org = async (db, o = {}) => {
  n += 1;
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.organizations (id,name,slug,code_number,potency,rite,city,state,meeting_schedule,contact_email,emblem_url,latitude,longitude,is_active,created_at)
     VALUES ($1,$2,$3,$4,$5,'REAA',$6,$7,$8,$9,$10,$11,$12,$13, now() - ($14 || ' minutes')::interval)`,
    [id, o.name ?? `Loja ${n}`, o.slug ?? null, o.code ?? n, o.potency ?? 'GOB', o.city ?? 'Feira de Santana', o.state ?? 'BA', o.meeting ?? null,
     o.contactEmail ?? null, o.emblem ?? null, o.lat ?? null, o.lng ?? null, o.active ?? true, String(o.minutesAgo ?? n)]);
  return id;
};
const contact = (db, orgId, type, value, sort = 0) => db.query(`INSERT INTO public.organization_contacts (organization_id,type,value,sort_order) VALUES ($1,$2,$3,$4)`, [orgId, type, value, sort]);

console.log('Migration 252 · lista de lojas do admin (PGlite)');

await ok('ANTES (250): a função falha com a coluna inexistente, como no banco oficial', async () => {
  const db = await freshDb(false); await as(db, 'service_role'); await org(db);
  await denied(() => list(db), /column o\.phone does not exist/);
});
await ok('DEPOIS: devolve itens, total, páginas e indicadores no mesmo formato', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  await org(db, { name: 'Loja Alfa', lat: 1, lng: 2, emblem: 'x.png', meeting: 'Sextas', potency: 'GOB' });
  await org(db, { name: 'Loja Beta', active: false });
  await org(db, { name: 'Loja Gama' });
  const r = await list(db);
  eq(Object.keys(r).sort(), ['items', 'kpis', 'page', 'page_size', 'total', 'total_pages']);
  eq(r.total, 3); eq(r.total_pages, 1); eq(r.items.length, 3);
  // jsonb não preserva a ordem das chaves: compara por nome.
  eq(['total', 'published', 'inactive', 'missing_coords', 'missing_emblem', 'possible_duplicates'].map((k) => r.kpis[k]), [3, 2, 1, 2, 2, 0]);
  eq(Object.keys(r.items[0]).sort(), ['address', 'city', 'code_number', 'completeness_percent', 'created_at', 'email', 'emblem_url', 'id', 'is_active', 'latitude', 'longitude', 'meeting_schedule', 'name', 'phone', 'potency', 'provenance', 'rite', 'slug', 'state']);
});
await ok('telefone e e-mail vêm de organization_contacts, com reserva em contact_email, e entram na completude', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  const a = await org(db, { name: 'Com contatos', contactEmail: 'reserva@x.com' });
  await contact(db, a, 'whatsapp', '75 99999-0000', 1); await contact(db, a, 'phone', '75 3333-0000', 2); await contact(db, a, 'email', 'loja@x.com', 0);
  const b = await org(db, { name: 'So reserva', contactEmail: 'so@x.com' });
  const c = await org(db, { name: 'Sem contato' });
  const items = Object.fromEntries((await list(db)).items.map((i) => [i.name, i]));
  eq([items['Com contatos'].phone, items['Com contatos'].email], ['75 3333-0000', 'loja@x.com'], 'phone tem prioridade sobre whatsapp; e-mail do contato antes do reserva');
  eq([items['So reserva'].phone, items['So reserva'].email], [null, 'so@x.com']);
  eq([items['Sem contato'].phone, items['Sem contato'].email], [null, null]);
  eq(items['Com contatos'].completeness_percent > items['Sem contato'].completeness_percent, true, 'contato conta na completude');
  void b; void c;
});
await ok('várias linhas de contato não duplicam a loja (uma linha por organização)', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  const a = await org(db, { name: 'Unica' });
  for (let i = 0; i < 4; i += 1) { await contact(db, a, 'phone', `7500000${i}`, i); await contact(db, a, 'email', `a${i}@x.com`, i); }
  const r = await list(db); eq(r.total, 1); eq(r.items.length, 1);
});
await ok('paginação funciona na MESMA instrução (total correto, página 2 e tamanho máximo 50)', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  for (let i = 0; i < 13; i += 1) await org(db, { name: `Loja ${String(i).padStart(2, '0')}`, minutesAgo: i });
  const p1 = await list(db, { size: 5, page: 1 }); const p3 = await list(db, { size: 5, page: 3 });
  eq([p1.total, p1.total_pages, p1.items.length], [13, 3, 5]);
  eq([p3.page, p3.items.length], [3, 3]);
  eq(p1.items[0].name, 'Loja 00', 'mais recente primeiro');
  eq((await list(db, { size: 999 })).page_size, 50);
});
await ok('filtros: busca (nome, cidade, número), estado, potência, status, sem coordenadas e sem brasão', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  await org(db, { name: 'Acacia', city: 'Salvador', state: 'BA', code: 77, potency: 'GOB', lat: 1, lng: 1, emblem: 'e.png' });
  await org(db, { name: 'Esquadro', city: 'Recife', state: 'PE', code: 12, potency: 'GOP', active: false });
  eq((await list(db, { q: 'acac' })).total, 1);
  eq((await list(db, { q: 'recife' })).total, 1);
  eq((await list(db, { q: '77' })).total, 1);
  eq((await list(db, { state: 'pe' })).total, 1);
  eq((await list(db, { potency: 'gob' })).total, 1);
  eq((await list(db, { status: 'inactive' })).total, 1);
  eq((await list(db, { status: 'published' })).total, 1);
  eq((await list(db, { coords: true })).total, 1);
  eq((await list(db, { emblem: true })).total, 1);
});
await ok('tabela vazia: itens vazios, total 0 e sem erro', async () => {
  const db = await freshDb(true); await as(db, 'service_role');
  const r = await list(db); eq([r.items, r.total, r.total_pages], [[], 0, 0]);
});
await ok('trava mantida: usuário comum e anônimo são recusados; privilégio só para service_role', async () => {
  const db = await freshDb(true);
  for (const role of ['authenticated', 'anon']) { await as(db, role); await denied(() => list(db), /FORBIDDEN: Função restrita ao servidor/); }
  const priv = async (r) => (await db.query(`SELECT has_function_privilege($1, p.oid, 'execute') AS r FROM pg_proc p WHERE p.proname = 'get_admin_lodges_list'`, [r])).rows[0].r;
  eq([await priv('anon'), await priv('authenticated'), await priv('service_role')], [false, false, true]);
});
await ok('rollback volta ao defeito e a 252 pode ser reaplicada', async () => {
  const db = await freshDb(true); await as(db, 'service_role'); await org(db);
  await db.exec(read('supabase/rollbacks/connections/252_rollback.sql'));
  await denied(() => list(db), /column o\.phone does not exist/);
  await db.exec(read('supabase/migrations/252_fix_admin_lodges_list.sql'));
  eq((await list(db)).total, 1);
});

console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
if (failed > 0) { for (const f of failures) console.log(' - ' + f); process.exit(1); }
