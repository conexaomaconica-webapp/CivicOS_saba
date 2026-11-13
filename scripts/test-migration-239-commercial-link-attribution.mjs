// Gate 1C.1 · Módulo Comercial — atribuição automática pelo link (migration 239) em PostgreSQL real (PGlite).
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
  '237_commercial_authorization_audit.sql', '238_commercial_leads_operations.sql', '239_commercial_link_attribution.sql',
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
  console.log('GATE 1C.1 · MÓDULO COMERCIAL · ATRIBUIÇÃO PELO LINK (migration 239, PGlite)');
  console.log('================================================================');
  const db = await freshDb();

  console.log('\n[1] Aplicação, permissões e imutabilidade');
  await ok('re-execução da 239 é idempotente', async () => { await db.exec(read('supabase/migrations/239_commercial_link_attribution.sql')); });
  await ok('funções e fila só para service_role (nunca anon/authenticated)', async () => {
    for (const fn of ['commercial_claim_referral(uuid,uuid,uuid,text,uuid,text[],timestamptz,uuid,uuid,int)', 'commercial_record_attribution_issue(uuid,uuid,uuid,uuid,text,uuid,timestamptz,jsonb,uuid)']) {
      const r = await row(db, `SELECT has_function_privilege('anon','${fn}','EXECUTE') AS an, has_function_privilege('authenticated','${fn}','EXECUTE') AS au, has_function_privilege('service_role','${fn}','EXECUTE') AS sr`);
      if (r.an || r.au) throw new Error(`${fn} acessível a anon/authenticated`);
      eq(r.sr, true, fn);
    }
    const g = await row(db, `SELECT has_table_privilege('authenticated','public.commercial_attribution_issues','SELECT') AS au, has_table_privilege('anon','public.commercial_attribution_issues','SELECT') AS an`);
    if (g.au || g.an) throw new Error('fila acessível a anon/authenticated');
    eq((await row(db, `SELECT relrowsecurity AS rls FROM pg_class WHERE relname='commercial_attribution_issues'`)).rls, true, 'RLS');
  });
  await ok('hash do token e validade da evidência são imutáveis; vínculo da empresa só de NULL para valor', async () => {
    const t = await tenant(db); const r = await rep(db, t); const e = await evidence(db, t, r); const b1 = await biz(db, t); const b2 = await biz(db, t);
    for (const sql of [`UPDATE public.commercial_referral_evidence SET visit_token_hash = '${'a'.repeat(64)}' WHERE id=$1`, `UPDATE public.commercial_referral_evidence SET valid_until = now() + interval '900 days' WHERE id=$1`]) {
      let err = null; try { await db.query(sql, [e.id]); } catch (x) { err = x; }
      if (!err) throw new Error(`mutação aceita: ${sql}`);
    }
    await db.query(`UPDATE public.commercial_referral_evidence SET business_id=$2 WHERE id=$1`, [e.id, b1]);
    let err = null; try { await db.query(`UPDATE public.commercial_referral_evidence SET business_id=$2 WHERE id=$1`, [e.id, b2]); } catch (x) { err = x; }
    if (!err) throw new Error('troca de empresa aceita');
  });
  await rejects('formato do hash é validado (64 hex)', () => db.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type, visit_token_hash) SELECT tenant_id, id, 'referral_link_visit', 'abc' FROM public.commercial_representatives LIMIT 1`), /token_hash_format/);
  await rejects('hash de token é único', async () => {
    const t = await tenant(db); const r = await rep(db, t); const e = await evidence(db, t, r);
    await db.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type, visit_token_hash, valid_until) VALUES ($1,$2,'referral_link_visit',$3, now())`, [t, r, e.hash]);
  }, /uq_commercial_evidence_visit_token|duplicate/);

  console.log('\n[2] Chaves de controle');
  await ok('módulo desligado ou chave automática desligada: nada acontece (disabled)', async () => {
    for (const opts of [{ module: false }, { link: false }]) {
      const t = await tenant(db, opts); const r = await rep(db, t); const b = await biz(db, t); const e = await evidence(db, t, r);
      eq((await claim(db, t, b, e.hash)).result, 'disabled', JSON.stringify(opts));
      eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
      eq(await count(db, `SELECT 1 FROM public.commercial_attribution_issues WHERE tenant_id='${t}'`), 0);
      eq((await row(db, `SELECT business_id FROM public.commercial_referral_evidence WHERE id=$1`, [e.id])).business_id, null, 'evidência intocada');
    }
  });
  await ok('chave automática nasce desligada por padrão', async () => {
    const t = randomUUID();
    await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1,'x')`, [t]);
    await db.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled) VALUES ($1,true)`, [t]);
    eq((await row(db, `SELECT link_auto_attribution_enabled AS v FROM public.commercial_settings WHERE tenant_id=$1`, [t])).v, false);
  });

  console.log('\n[3] Caso limpo, idempotência e validação do token');
  const t1 = await tenant(db);
  const repA = await rep(db, t1);
  await ok('cria atribuição PENDENTE (nunca confirmada) vinculada à evidência, com validade = a da evidência', async () => {
    const b = await biz(db, t1); const e = await evidence(db, t1, repA);
    const res = await claim(db, t1, b, e.hash);
    eq(res.result, 'created');
    const a = await row(db, `SELECT * FROM public.commercial_attributions WHERE id=$1`, [res.attribution_id]);
    eq(a.status, 'pending'); eq(a.attribution_type, 'referral_link'); eq(a.representative_id, repA); eq(a.origin_evidence_id, e.id); eq(a.confirmed_at, null);
    eq(new Date(a.valid_until).getTime(), e.validUntil.getTime(), 'validade igual à da evidência (sem extensão)');
    eq((await row(db, `SELECT business_id FROM public.commercial_referral_evidence WHERE id=$1`, [e.id])).business_id, b, 'evidência vinculada');
  });
  await ok('idempotente: repetir a reivindicação não duplica', async () => {
    const b = await biz(db, t1); const e = await evidence(db, t1, repA);
    const r1 = await claim(db, t1, b, e.hash); const r2 = await claim(db, t1, b, e.hash); const r3 = await claim(db, t1, b, e.hash, { byEvidence: e.id });
    eq(r1.result, 'created'); eq(r2.result, 'already_attributed'); eq(r3.result, 'already_attributed');
    eq(r2.attribution_id, r1.attribution_id);
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 1);
  });
  await ok('token inexistente/forjado: invalid_token, sem efeitos e sem pendência', async () => {
    const b = await biz(db, t1);
    eq((await claim(db, t1, b, sha('forjado'))).result, 'invalid_token');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
    eq(await count(db, `SELECT 1 FROM public.commercial_attribution_issues WHERE business_id='${b}'`), 0);
  });
  await ok('isolamento por tenant: evidência de outro tenant não é aceita', async () => {
    const t2 = await tenant(db); const r2 = await rep(db, t2); const e2 = await evidence(db, t2, r2); const b = await biz(db, t1);
    eq((await claim(db, t1, b, e2.hash)).result, 'invalid_token');
  });
  await ok('empresa de outro tenant não existe para a reivindicação', async () => {
    const t2 = await tenant(db); const b2 = await biz(db, t2); const e = await evidence(db, t1, repA);
    eq((await claim(db, t1, b2, e.hash)).result, 'business_not_found');
  });
  await rejects('argumentos inválidos (token e evidência ao mesmo tempo, ou nenhum)', async () => {
    const b = await biz(db, t1); const e = await evidence(db, t1, repA);
    await db.query(`SELECT public.commercial_claim_referral($1,$2,NULL,$3,$4)`, [t1, b, e.hash, e.id]);
  }, /claim_requires_token_or_evidence/);

  console.log('\n[4] Uso único (sem replay) e expiração');
  await ok('mesma evidência não atribui uma SEGUNDA empresa (replay): pendência registrada, sem atribuição', async () => {
    const e = await evidence(db, t1, repA); const b1 = await biz(db, t1); const b2 = await biz(db, t1);
    eq((await claim(db, t1, b1, e.hash)).result, 'created');
    const res = await claim(db, t1, b2, e.hash);
    eq(res.result, 'issue'); eq(res.issue_kind, 'evidence_used_by_other_business');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b2}'`), 0);
  });
  await ok('evidência expirada ANTES do cadastro: sem atribuição; evidência preservada e pendência registrada', async () => {
    const e = await evidence(db, t1, repA, { validDays: 30, ageDays: 40 }); const b = await biz(db, t1);
    const res = await claim(db, t1, b, e.hash);
    eq(res.issue_kind, 'evidence_expired');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
    eq(await count(db, `SELECT 1 FROM public.commercial_referral_evidence WHERE id='${e.id}'`), 1, 'evidência preservada');
  });
  await ok('cadastro DENTRO da validade vale mesmo sem o cookie depois (reprocesso por evidência, momento do cadastro)', async () => {
    // evidência capturada há 40 dias com validade de 45; cadastro foi há 20 dias (válido); reprocesso hoje, ainda válida.
    const e = await evidence(db, t1, repA, { validDays: 45, ageDays: 40 }); const b = await biz(db, t1);
    const res = await claim(db, t1, b, null, { byEvidence: e.id, claimAt: new Date(Date.now() - 20 * 86400000).toISOString() });
    eq(res.result, 'created');
  });
  await ok('reprocesso tardio: evidência válida NO cadastro mas já vencida hoje → pendente com janela curta declarada', async () => {
    const e = await evidence(db, t1, repA, { validDays: 30, ageDays: 40 }); const b = await biz(db, t1);
    const res = await claim(db, t1, b, null, { byEvidence: e.id, claimAt: new Date(Date.now() - 20 * 86400000).toISOString() });
    eq(res.result, 'created');
    const a = await row(db, `SELECT valid_until, notes FROM public.commercial_attributions WHERE id=$1`, [res.attribution_id]);
    const days = (new Date(a.valid_until).getTime() - Date.now()) / 86400000;
    if (days < 6 || days > 7.1) throw new Error(`janela de recuperação inesperada: ${days} dias`);
    if (!/Recuperação tardia/.test(a.notes)) throw new Error('nota de recuperação ausente');
  });
  await ok('expiração posterior: pendente vencida é expirada e a evidência permanece', async () => {
    const e = await evidence(db, t1, repA); const b = await biz(db, t1);
    const res = await claim(db, t1, b, e.hash);
    await db.query(`UPDATE public.commercial_attributions SET valid_until = now() - interval '1 day' WHERE id=$1`, [res.attribution_id]);
    await db.query(`SELECT public.commercial_expire_stale($1)`, [t1]);
    eq((await row(db, `SELECT status FROM public.commercial_attributions WHERE id=$1`, [res.attribution_id])).status, 'expired');
    eq(await count(db, `SELECT 1 FROM public.commercial_referral_evidence WHERE id='${e.id}'`), 1);
  });

  console.log('\n[5] Representante e autoindicação');
  await ok('representante suspenso: sem atribuição; depois de reativado, o reprocesso (por evidência) cria e fecha a pendência', async () => {
    const t = await tenant(db); const r = await rep(db, t, { status: 'suspended' }); const b = await biz(db, t); const e = await evidence(db, t, r); const admin = await user(db);
    const res = await claim(db, t, b, e.hash);
    eq(res.issue_kind, 'rep_inactive');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
    await db.query(`UPDATE public.commercial_representatives SET status='active', suspended_at=NULL WHERE id=$1`, [r]);
    const retry = await claim(db, t, b, null, { byEvidence: e.id, issueId: res.issue_id, actor: admin });
    eq(retry.result, 'created');
    const issue = await row(db, `SELECT status, resolution FROM public.commercial_attribution_issues WHERE id=$1`, [res.issue_id]);
    eq(issue.status, 'resolved'); eq(issue.resolution, 'retry_created');
  });
  await ok('autoindicação (usuário dono da empresa é o próprio representante): pendência, sem atribuição', async () => {
    const t = await tenant(db); const u = await user(db); const r = await rep(db, t, { userId: u }); const b = await biz(db, t); const e = await evidence(db, t, r);
    eq((await claim(db, t, b, e.hash, { user: u })).issue_kind, 'self_referral');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
  });

  console.log('\n[6] Precedência: confirmada > reserva de lead > primeira evidência > posterior');
  await ok('atribuição CONFIRMADA de outro representante nunca é substituída (conflict_confirmed)', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const rB = await rep(db, t); const b = await biz(db, t);
    const eA = await evidence(db, t, rA);
    const first = await claim(db, t, b, eA.hash);
    const admin = await user(db);
    await db.query(`SELECT public.commercial_confirm_attribution($1,$2,$3)`, [t, first.attribution_id, admin]);
    const eB = await evidence(db, t, rB);
    const res = await claim(db, t, b, eB.hash);
    eq(res.issue_kind, 'conflict_confirmed');
    eq((await row(db, `SELECT representative_id, status FROM public.commercial_attributions WHERE id=$1`, [first.attribution_id])).status, 'confirmed');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 1);
  });
  await ok('confirmada do MESMO representante: já atribuída (sem duplicar, sem pendência)', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const b = await biz(db, t);
    const first = await claim(db, t, b, (await evidence(db, t, rA)).hash);
    await db.query(`SELECT public.commercial_confirm_attribution($1,$2,$3)`, [t, first.attribution_id, await user(db)]);
    eq((await claim(db, t, b, (await evidence(db, t, rA)).hash)).result, 'already_attributed');
    eq(await count(db, `SELECT 1 FROM public.commercial_attribution_issues WHERE business_id='${b}'`), 0);
  });
  await ok('lead QUALIFICADO de outro representante com reserva vigente prevalece sobre o link', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const rB = await rep(db, t); const b = await biz(db, t);
    const leadB = await lead(db, t, rB, { status: 'qualified', key: 'chave-x', reservedDays: 40 });
    const res = await claim(db, t, b, (await evidence(db, t, rA)).hash, { keys: ['chave-x'] });
    eq(res.issue_kind, 'reserved_by_other');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 0);
    eq((await row(db, `SELECT detail->>'lead_id' AS l FROM public.commercial_attribution_issues WHERE id=$1`, [res.issue_id])).l, leadB);
  });
  await ok('reserva EXPIRADA, lead não qualificado ou chave diferente não bloqueiam o link', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const rB = await rep(db, t);
    await lead(db, t, rB, { status: 'qualified', key: 'k-exp', reservedDays: -1 });
    await lead(db, t, rB, { status: 'contacted', key: 'k-new' });
    for (const k of ['k-exp', 'k-new', 'k-outra']) {
      const b = await biz(db, t);
      eq((await claim(db, t, b, (await evidence(db, t, rA)).hash, { keys: [k] })).result, 'created', k);
    }
  });
  await ok('lead do MESMO representante: atribuição pendente já vinculada ao lead', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const b = await biz(db, t);
    const l = await lead(db, t, rA, { status: 'qualified', key: 'k-same', reservedDays: 30 });
    const res = await claim(db, t, b, (await evidence(db, t, rA)).hash, { keys: ['k-same'] });
    eq(res.result, 'created');
    eq((await row(db, `SELECT lead_id FROM public.commercial_attributions WHERE id=$1`, [res.attribution_id])).lead_id, l);
  });
  await ok('pendente de outro representante NÃO é substituída: o posterior vira pendência para arbitragem', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const rB = await rep(db, t); const b = await biz(db, t);
    const first = await claim(db, t, b, (await evidence(db, t, rA)).hash);
    const second = await claim(db, t, b, (await evidence(db, t, rB)).hash);
    eq(first.result, 'created'); eq(second.issue_kind, 'competing_pending');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b}'`), 1);
    eq((await row(db, `SELECT representative_id FROM public.commercial_attributions WHERE business_id=$1`, [b])).representative_id, rA);
  });
  await ok('repetir o mesmo caso não duplica a pendência (incrementa tentativas)', async () => {
    const t = await tenant(db); const rA = await rep(db, t); const rB = await rep(db, t); const b = await biz(db, t);
    await claim(db, t, b, (await evidence(db, t, rA)).hash);
    const eB = await evidence(db, t, rB);
    await claim(db, t, b, eB.hash); await claim(db, t, b, eB.hash);
    eq(await count(db, `SELECT 1 FROM public.commercial_attribution_issues WHERE business_id='${b}' AND kind='competing_pending'`), 1);
    eq((await row(db, `SELECT attempts FROM public.commercial_attribution_issues WHERE business_id=$1`, [b])).attempts, 2);
  });
  await ok('nenhum desfecho automático gera atribuição confirmada', async () => {
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE attribution_type='referral_link' AND status='confirmed' AND confirmed_by IS NULL`), 0);
  });

  console.log('\n[7] Fila de pendências');
  await ok('encerrar pendência exige decisão e justificativa (mín. 10 caracteres)', async () => {
    const t = await tenant(db); const r = await rep(db, t, { status: 'suspended' }); const b = await biz(db, t);
    const res = await claim(db, t, b, (await evidence(db, t, r)).hash);
    let err = null;
    try { await db.query(`UPDATE public.commercial_attribution_issues SET status='discarded' WHERE id=$1`, [res.issue_id]); } catch (e) { err = e; }
    if (!err) throw new Error('encerrou sem justificativa');
    await db.query(`UPDATE public.commercial_attribution_issues SET status='discarded', resolved_at=now(), resolution='discarded', resolution_note='Descartada pela equipe: contrato encerrado.' WHERE id=$1`, [res.issue_id]);
  });
  await ok('pendência preserva a evidência (FK RESTRICT) e sobrevive à exclusão da empresa (SET NULL)', async () => {
    const t = await tenant(db); const r = await rep(db, t, { status: 'suspended' }); const b = await biz(db, t); const e = await evidence(db, t, r);
    const res = await claim(db, t, b, e.hash);
    let err = null;
    try { await db.query(`DELETE FROM public.commercial_referral_evidence WHERE id=$1`, [e.id]); } catch (x) { err = x; }
    if (!err) throw new Error('evidência apagada');
    await db.query(`DELETE FROM public.businesses WHERE id=$1`, [b]);
    eq((await row(db, `SELECT business_id FROM public.commercial_attribution_issues WHERE id=$1`, [res.issue_id])).business_id, null);
  });
  await ok('apagar a empresa NÃO libera o token: a evidência continua consumida (sem replay em outra empresa)', async () => {
    const t = await tenant(db); const r = await rep(db, t); const b1 = await biz(db, t); const b2 = await biz(db, t); const e = await evidence(db, t, r);
    eq((await claim(db, t, b1, e.hash)).result, 'created');
    await db.query(`UPDATE public.commercial_attributions SET status='revoked', revoked_at=now(), revoke_reason='teste de exclusão da empresa' WHERE business_id=$1`, [b1]);
    await db.query(`DELETE FROM public.commercial_attributions WHERE business_id=$1`, [b1]).catch(() => {});
    await db.query(`UPDATE public.commercial_referral_evidence SET business_id=NULL WHERE id=$1`, [e.id]);
    eq((await claim(db, t, b2, e.hash)).issue_kind, 'evidence_used_by_other_business');
    eq(await count(db, `SELECT 1 FROM public.commercial_attributions WHERE business_id='${b2}'`), 0);
  });

  console.log('\n[8] Rollback 239');
  await ok('rollback remove os objetos e restaura o guard; a 239 reaplica depois', async () => {
    const d = await freshDb();
    await d.exec(read('supabase/rollbacks/commercial/239_rollback.sql'));
    eq((await row(d, `SELECT count(*)::int AS n FROM pg_proc WHERE proname IN ('commercial_claim_referral','commercial_record_attribution_issue')`)).n, 0);
    eq(await count(d, `SELECT 1 FROM information_schema.columns WHERE table_name='commercial_referral_evidence' AND column_name IN ('visit_token_hash','valid_until','consumed_at')`), 0);
    eq((await row(d, `SELECT to_regclass('public.commercial_attribution_issues') AS r`)).r, null);
    await d.exec(read('supabase/migrations/239_commercial_link_attribution.sql'));
  });
  await ok('rollback recusa se houver tokens/pendências (origem de indicações)', async () => {
    const d = await freshDb();
    const t = await tenant(d); const r = await rep(d, t); await evidence(d, t, r);
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/239_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria recusar');
  });

  console.log('\n================================================================');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
}

main().catch((e) => { console.error('ERRO FATAL NA SUÍTE:', e); process.exit(1); });
