// Gate 1C.2 · Módulo Comercial — acesso direto do representante (migration 240) em PostgreSQL real (PGlite).
// LIMITES: PGlite é uma única conexão: a serialização por trava (advisory lock / FOR UPDATE) é exercitada em sequência,
// não com sessões realmente simultâneas; RLS/JWT reais e Docker/pgTAP não foram executados neste ambiente.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = [
  '228_commercial_foundation.sql', '229_commercial_leads_attributions.sql', '230_commercial_commission_rules.sql',
  '231_commercial_financial_events.sql', '232_commercial_ledger_payouts.sql', '233_commercial_security_audit.sql',
  '234_commercial_authorization.sql', '235_commercial_rls_policies.sql', '236_commercial_storage_policies.sql',
  '237_commercial_authorization_audit.sql', '238_commercial_leads_operations.sql', '239_commercial_link_attribution.sql', '240_commercial_representative_access.sql',
];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
const failures = [];
async function ok(name, fn) {
  try { await fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failed += 1; failures.push(`${name}: ${e.message}`); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
async function rejects(name, fn, pattern) {
  await ok(name, async () => {
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    if (!err) throw new Error('esperava erro, mas a operação foi aceita');
    if (pattern && !pattern.test(err.message)) throw new Error(`erro inesperado: ${err.message}`);
  });
}
function eq(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label} esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

const BASE_SCHEMA = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false, file_size_limit BIGINT, allowed_mime_types TEXT[]);
  CREATE TABLE storage.objects (id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT ALL ON storage.objects TO authenticated, service_role;
  CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  CREATE TABLE public.tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT);
  CREATE TABLE public.profiles (id UUID PRIMARY KEY, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active', deleted_at TIMESTAMPTZ);
  CREATE TABLE public.roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT, is_global BOOLEAN DEFAULT false);
  CREATE TABLE public.user_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, role_id UUID, tenant_id UUID, status TEXT DEFAULT 'active', expires_at TIMESTAMPTZ);
  CREATE FUNCTION public.has_global_platform_role(p_role TEXT) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    IF p_role IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
    RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = p_role AND p.status = 'active' AND p.deleted_at IS NULL);
  END; $$;
  CREATE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  CREATE TABLE public.businesses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id), name TEXT, CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id));
  CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, business_id UUID NOT NULL, invoice_number TEXT NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL, amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00, currency TEXT NOT NULL DEFAULT 'BRL', status TEXT NOT NULL DEFAULT 'draft',
    due_date DATE NOT NULL DEFAULT current_date, paid_at TIMESTAMPTZ, payment_method TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE);
  CREATE TABLE public.business_commercial_terms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, business_id UUID NOT NULL UNIQUE, commercial_modality TEXT NOT NULL DEFAULT 'padrao', amount_cents INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE public.business_signup_invites (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.landing_leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
`;

async function freshDb(upTo = MIGRATIONS.length) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(BASE_SCHEMA);
  for (const f of MIGRATIONS.slice(0, upTo)) await db.exec(read(`supabase/migrations/${f}`));
  return db;
}

let seq = 0;
const sha = (s) => createHash('sha256').update(s).digest('hex');
const tenant = async (db, { module = true, link = true, days = 60 } = {}) => {
  const t = randomUUID();
  await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1,$2)`, [t, `t${t.slice(0, 5)}`]);
  await db.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled, lead_reservation_days, link_auto_attribution_enabled) VALUES ($1,$2,$3,$4)`, [t, module, days, link]);
  return t;
};
const user = async (db) => {
  const id = randomUUID();
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1,$2)`, [id, `u${id.slice(0, 6)}@t.com`]);
  return id;
};
const rep = async (db, t, { status = 'active', userId = null } = {}) => {
  seq += 1;
  const id = randomUUID();
  const needsContract = ['active', 'suspended', 'terminated'].includes(status);
  await db.query(
    `INSERT INTO public.commercial_representatives (id, tenant_id, user_id, person_type, legal_name, email, referral_code, status, contract_accepted_at, document_hash, terminated_at)
     VALUES ($1,$2,$3,'pf',$4,$5,$6,$7,$8,$9,$10)`,
    [id, t, userId, `Rep ${seq}`, `r${seq}@t.com`, `REP-${String(500000 + seq)}`, status,
      needsContract ? new Date().toISOString() : null, needsContract ? `h-${id}` : null, status === 'terminated' ? new Date().toISOString() : null]);
  return id;
};
const biz = async (db, t) => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name) VALUES ($1,$2,'Empresa')`, [id, t]);
  return id;
};
// Evidência de visita ao link com token (retorna o token claro e o hash).
const evidence = async (db, t, r, { validDays = 30, ageDays = 0 } = {}) => {
  const token = randomUUID() + randomUUID();
  const hash = sha(token);
  const captured = new Date(Date.now() - ageDays * 86400000);
  const validUntil = new Date(captured.getTime() + validDays * 86400000);
  const { rows } = await db.query(
    `INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type, reference_code, captured_at, visit_token_hash, valid_until)
     VALUES ($1,$2,'referral_link_visit','REP-X',$3,$4,$5) RETURNING id`, [t, r, captured.toISOString(), hash, validUntil.toISOString()]);
  return { id: rows[0].id, hash, token, validUntil };
};
const lead = async (db, t, r, { status = 'new', key, reservedDays = null } = {}) => {
  const id = randomUUID();
  const qualified = ['qualified', 'proposal', 'won'].includes(status);
  await db.query(
    `INSERT INTO public.commercial_leads (id, tenant_id, representative_id, source, company_name, dedupe_key, status, qualified_at, reserved_until)
     VALUES ($1,$2,$3,'representative','Lead',$4,$5,$6,$7)`,
    [id, t, r, key ?? `dk-${id}`, status, qualified ? new Date().toISOString() : null,
      reservedDays === null ? null : new Date(Date.now() + reservedDays * 86400000).toISOString()]);
  return id;
};
const claim = async (db, t, b, hash, extra = {}) => {
  const { rows } = await db.query(
    `SELECT public.commercial_claim_referral($1,$2,$3,$4,$5,$6,$7,$8,$9) AS r`,
    [t, b, extra.user ?? null, extra.byEvidence ? null : hash, extra.byEvidence ?? null, extra.keys ?? [], extra.claimAt ?? new Date().toISOString(), extra.actor ?? null, extra.issueId ?? null]);
  return rows[0].r;
};
const row = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];
const count = async (db, sql, params = []) => (await row(db, `SELECT count(*)::int AS n FROM (${sql}) x`, params)).n;

async function main() {
  console.log('================================================================');
  console.log('GATE 1C.2 · MÓDULO COMERCIAL · ACESSO DIRETO DO REPRESENTANTE (migration 240, PGlite)');
  console.log('================================================================');
  const db = await freshDb();

  console.log('\n[1] Esquema e restrições');
  await ok('re-execução da 240 é idempotente', async () => { await db.exec(read('supabase/migrations/240_commercial_representative_access.sql')); });
  await ok('representante existente nasce como convite, sem validade nem troca', async () => {
    const t = await tenant(db); const r = await rep(db, t);
    const x = await row(db, `SELECT access_mode, temp_password_expires_at, password_changed_at FROM public.commercial_representatives WHERE id=$1`, [r]);
    eq(x.access_mode, 'invite'); eq(x.temp_password_expires_at, null); eq(x.password_changed_at, null);
  });
  await rejects('modo de acesso inválido é recusado', async () => {
    const t = await tenant(db); const r = await rep(db, t);
    await db.query(`UPDATE public.commercial_representatives SET access_mode='qualquer' WHERE id=$1`, [r]);
  }, /access_mode_check/);
  await rejects('validade de senha temporária só existe no modo temp_password', async () => {
    const t = await tenant(db); const r = await rep(db, t);
    await db.query(`UPDATE public.commercial_representatives SET temp_password_expires_at=now() + interval '3 days' WHERE id=$1`, [r]);
  }, /temp_expiry_check/);
  await ok('modo temp_password aceita validade e depois a troca de senha', async () => {
    const t = await tenant(db); const r = await rep(db, t, { status: 'pending_review' });
    await db.query(`UPDATE public.commercial_representatives SET access_mode='temp_password', temp_password_expires_at=now() + interval '72 hours' WHERE id=$1`, [r]);
    await db.query(`UPDATE public.commercial_representatives SET temp_password_expires_at=NULL, password_changed_at=now() WHERE id=$1`, [r]);
  });

  console.log('\n[2] Permissões');
  await ok('authenticated lê as 3 colunas e NÃO pode alterá-las', async () => {
    for (const c of ['access_mode', 'temp_password_expires_at', 'password_changed_at']) {
      eq((await row(db, `SELECT has_column_privilege('authenticated','public.commercial_representatives',$1,'SELECT') AS p`, [c])).p, true, `select ${c}`);
      eq((await row(db, `SELECT has_column_privilege('authenticated','public.commercial_representatives',$1,'UPDATE') AS p`, [c])).p, false, `update ${c}`);
      eq((await row(db, `SELECT has_column_privilege('anon','public.commercial_representatives',$1,'SELECT') AS p`, [c])).p, false, `anon ${c}`);
    }
  });
  await ok('nenhuma coluna guarda senha', async () => {
    const n = await count(db, `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='commercial_representatives' AND column_name ILIKE '%pass%' AND column_name NOT IN ('temp_password_expires_at','password_changed_at')`);
    eq(n, 0);
  });

  console.log('\n[3] Rollback');
  await ok('rollback recusa com representante em senha temporária', async () => {
    const d = await freshDb();
    const t = await tenant(d); const r = await rep(d, t, { status: 'pending_review' });
    await d.query(`UPDATE public.commercial_representatives SET access_mode='temp_password', temp_password_expires_at=now() + interval '1 day' WHERE id=$1`, [r]);
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/240_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria recusar');
  });
  await ok('rollback limpo remove as colunas e a 240 pode ser reaplicada', async () => {
    const d = await freshDb();
    await d.exec(read('supabase/rollbacks/commercial/240_rollback.sql'));
    eq(await count(d, `SELECT 1 FROM information_schema.columns WHERE table_name='commercial_representatives' AND column_name='access_mode'`), 0);
    await d.exec(read('supabase/migrations/240_commercial_representative_access.sql'));
    eq(await count(d, `SELECT 1 FROM information_schema.columns WHERE table_name='commercial_representatives' AND column_name='access_mode'`), 1);
  });

  console.log('\n================================================================');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
}

main().catch((e) => { console.error('ERRO FATAL NA SUÍTE:', e); process.exit(1); });
