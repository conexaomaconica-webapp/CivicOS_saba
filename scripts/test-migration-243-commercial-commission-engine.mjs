// Gate 1C.2 · Módulo Comercial — acesso direto do representante (migration 243) em PostgreSQL real (PGlite).
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
  '237_commercial_authorization_audit.sql', '238_commercial_leads_operations.sql', '239_commercial_link_attribution.sql', '240_commercial_representative_access.sql', '241_commercial_representative_contract.sql', '242_commercial_provider_reversals.sql', '243_commercial_commission_engine.sql',
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
  await db.exec("ALTER TABLE public.business_commercial_terms ADD COLUMN plan_code TEXT");
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

// ---- helpers do motor -------------------------------------------------------
const NIL = '00000000-0000-0000-0000-000000000000';
const engineTenant = async (db, { module = true } = {}) => {
  const t = randomUUID();
  await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1,$2)`, [t, `t${t.slice(0, 5)}`]);
  await db.query(`INSERT INTO public.commercial_settings (tenant_id, capture_mode, capture_starts_at, module_enabled) VALUES ($1,'shadow',$2,$3)`,
    [t, new Date(Date.now() - 400 * 86400000).toISOString(), module]);
  return t;
};
let invN = 0;
const paidInvoice = async (db, t, b, { paid = 1000, paidAtDaysAgo = 1 } = {}) => {
  invN += 1; const id = randomUUID();
  await db.query(`INSERT INTO public.invoices (id, tenant_id, business_id, invoice_number, amount_due, amount_paid, status, paid_at) VALUES ($1,$2,$3,$4,1000,$5,'paid',$6)`,
    [id, t, b, `E-${invN}`, paid, new Date(Date.now() - paidAtDaysAgo * 86400000).toISOString()]);
  return id;
};
const confirmedAttr = async (db, t, b, r, status = 'confirmed') => {
  const u = await user(db);
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, attribution_type, status, confirmed_at, confirmed_by, created_by)
     VALUES ($1,$2,$3,$4,'admin_assigned',$5,$6,$8,$7)`, [id, t, b, r, status, status === 'confirmed' ? new Date().toISOString() : null, u, status === 'confirmed' ? u : null]);
  return id;
};
const addRule = async (db, t, o = {}) => {
  const u = await user(db);
  const o2 = { kind: 'plan_default', rep: null, cat: null, plan: null, type: 'initial', priority: 0, rate: 1500, hold: 30, min: 0, max: null, status: 'active', enabled: true, illustrative: false, from: new Date(Date.now() - 500 * 86400000).toISOString(), until: null, ...o };
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.commercial_commission_rules (id, tenant_id, rule_kind, representative_id, category_id, plan_code, commission_type, priority, rate_bps, hold_days, min_base_cents, max_commission_cents,
       effective_from, effective_until, status, enabled, is_illustrative, approved_by, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())`,
    [id, t, o2.kind, o2.rep, o2.cat, o2.plan, o2.type, o2.priority, o2.rate, o2.hold, o2.min, o2.max, o2.from, o2.until, o2.status, o2.enabled, o2.illustrative, u]);
  return id;
};
const category = async (db, t, code = 'regional') => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.commercial_representative_categories (id, tenant_id, code, name) VALUES ($1,$2,$3,$4)`, [id, t, code, `Cat ${code}`]);
  return id;
};
const withPix = (db, r) => db.query(`UPDATE public.commercial_representatives SET pix_key_type='email', pix_key_encrypted='enc', pix_key_hint='…@x' WHERE id=$1`, [r]);
const pendingEvent = async (db, inv) => (await row(db, `SELECT id FROM public.commercial_financial_events WHERE invoice_id=$1 AND source_kind='invoice_trigger' ORDER BY seq LIMIT 1`, [inv])).id;
const proc = async (db, ev, actor = null) => (await row(db, `SELECT public.commercial_process_financial_event($1,$2) AS r`, [ev, actor])).r;
const procAll = async (db, t) => (await row(db, `SELECT public.commercial_process_pending_events($1,1000,NULL) AS r`, [t])).r;
const ledger = (db, rep, type = null) => db.query(`SELECT * FROM public.commercial_ledger_entries WHERE representative_id=$1 ${type ? `AND entry_type='${type}'` : ''} ORDER BY created_at, id`, [rep]).then((r) => r.rows);
const release = (db, entry) => row(db, `SELECT * FROM public.commercial_commission_releases WHERE ledger_entry_id=$1`, [entry]);
const sumLedger = async (db, rep) => Number((await row(db, `SELECT COALESCE(SUM(amount_cents),0)::bigint AS s FROM public.commercial_ledger_entries WHERE representative_id=$1`, [rep])).s);
const refund = async (db, t, inv, kind, amount = null, cumulative = false) =>
  (await row(db, `SELECT public.commercial_record_provider_reversal($1,$2,$3,$4,$5,now(),$6,'{}'::jsonb) AS r`, [t, inv, kind, amount, cumulative, `k-${randomUUID()}`])).r;
const proofDoc = async (db, t, r, type = 'payout_proof') => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.commercial_representative_documents (id, tenant_id, representative_id, doc_type, storage_path, mime_type, size_bytes) VALUES ($1,$2,$3,$4,$5,'application/pdf',100)`, [id, t, r, type, `p/${id}.pdf`]);
  return id;
};
const releaseNow = (db, t) => row(db, `SELECT public.commercial_release_due($1, now() + interval '400 days') AS n`, [t]).then((x) => x.n);

// cenário padrão: tenant do motor, representante ativo, empresa, atribuição confirmada, regra 15% e fatura de R$ 1.000
const scene = async (db, { rate = 1500, hold = 30, repStatus = 'active', ruleOpts = {}, attr = 'confirmed', paid = 1000 } = {}) => {
  const t = await engineTenant(db);
  const u = await user(db);
  const r = await rep(db, t, { status: repStatus, userId: u });
  const b = await biz(db, t);
  if (attr) await confirmedAttr(db, t, b, r, attr);
  if (rate !== null) await addRule(db, t, { rate, hold, ...ruleOpts });
  const inv = await paidInvoice(db, t, b, { paid });
  const ev = await pendingEvent(db, inv);
  return { t, u, r, b, inv, ev };
};

async function main() {
  console.log('================================================================');
  console.log('GATE 1E · MÓDULO COMERCIAL · MOTOR DE COMISSÕES E REPASSES (migration 243, PGlite)');
  console.log('================================================================');
  const db = await freshDb();

  console.log('\n[1] Esquema, permissões e regras por categoria');
  await ok('re-execução da 243 é idempotente', async () => { await db.exec(read('supabase/migrations/243_commercial_commission_engine.sql')); });
  await ok('funções e tabelas novas só para service_role', async () => {
    const fns = ['commercial_process_financial_event(uuid,uuid)', 'commercial_process_pending_events(uuid,integer,uuid)', 'commercial_reprocess_events(uuid,uuid,uuid)',
      'commercial_review_event(uuid,uuid,text,text,uuid)', 'commercial_release_due(uuid,timestamptz)', 'commercial_create_payout_draft(uuid,uuid,uuid,uuid)',
      'commercial_approve_payout(uuid,uuid,uuid,boolean)', 'commercial_mark_payout_paid(uuid,uuid,uuid,uuid,text)', 'commercial_cancel_payout(uuid,uuid,uuid,text)', 'commercial_close_period(uuid,date,date,uuid)'];
    for (const fn of fns) for (const r of ['anon', 'authenticated']) eq((await row(db, `SELECT has_function_privilege($1,$2,'EXECUTE') AS p`, [r, `public.${fn}`])).p, false, `${r} ${fn}`);
    for (const tb of ['commercial_representative_categories', 'commercial_clawbacks']) for (const r of ['anon', 'authenticated']) eq((await row(db, `SELECT has_table_privilege($1,$2,'SELECT') AS p`, [r, `public.${tb}`])).p, false, `${r} ${tb}`);
  });
  await ok('regra por categoria exige categoria; plano padrão não pode ter categoria', async () => {
    const t = await engineTenant(db); const c = await category(db, t);
    await addRule(db, t, { kind: 'category_default', cat: c });
    let e1 = null, e2 = null;
    try { await addRule(db, t, { kind: 'category_default', cat: null, priority: 5 }); } catch (e) { e1 = e; }
    try { await addRule(db, t, { kind: 'plan_default', cat: c, priority: 6 }); } catch (e) { e2 = e; }
    if (!e1 || !e2) throw new Error('esperava recusa');
  });
  await ok('regras de escopos diferentes não se excluem; mesma categoria sobreposta é recusada', async () => {
    const t = await engineTenant(db); const c = await category(db, t); const u = await user(db); const r = await rep(db, t, { userId: u });
    await addRule(db, t, { kind: 'plan_default' });
    await addRule(db, t, { kind: 'category_default', cat: c });
    await addRule(db, t, { kind: 'representative_override', rep: r });
    let err = null; try { await addRule(db, t, { kind: 'category_default', cat: c }); } catch (e) { err = e; }
    if (!err || !/no_overlap|exclu/i.test(err.message)) throw new Error('esperava recusa por sobreposição');
  });
  await ok('regra ativa continua imutável (inclui category_id)', async () => {
    const t = await engineTenant(db); const c = await category(db, t, 'cat-a'); const c2 = await category(db, t, 'cat-b');
    const id = await addRule(db, t, { kind: 'category_default', cat: c });
    let err = null; try { await db.query(`UPDATE public.commercial_commission_rules SET category_id=$2 WHERE id=$1`, [id, c2]); } catch (e) { err = e; }
    if (!err || !/imutável/.test(err.message)) throw new Error('esperava imutabilidade');
  });

  console.log('\n[2] Crédito de comissão');
  await ok('pagamento recebido gera crédito = floor(base × taxa) e carência a partir do pagamento', async () => {
    const s = await scene(db);
    const res = await proc(db, s.ev);
    eq(res.result, 'accrued'); eq(Number(res.amount_cents), 15000);
    const [acc] = await ledger(db, s.r, 'accrual');
    eq(Number(acc.base_amount_cents), 100000); eq(acc.rate_bps, 1500); if (!acc.rule_snapshot?.id) throw new Error('sem snapshot da regra');
    const rel = await release(db, acc.id);
    eq(rel.status, 'hold');
    const days = (new Date(rel.release_at) - new Date(acc.effective_at)) / 86400000;
    eq(Math.round(days), 30, 'carência');
    eq((await row(db, `SELECT status FROM public.commercial_financial_events WHERE id=$1`, [s.ev])).status, 'processed');
  });
  await ok('reprocessar o mesmo evento não duplica nada', async () => {
    const s = await scene(db); await proc(db, s.ev);
    eq((await proc(db, s.ev)).result, 'already_done');
    eq((await ledger(db, s.r, 'accrual')).length, 1);
  });
  await ok('arredondamento por truncamento (nunca para cima)', async () => {
    const s = await scene(db, { paid: 1000.01 });
    eq(Number((await proc(db, s.ev)).amount_cents), 15000, '15% de 100001 = 15000,15 -> 15000');
  });
  await ok('teto e valor mínimo da regra', async () => {
    const s1 = await scene(db, { ruleOpts: { max: 5000 } });
    eq(Number((await proc(db, s1.ev)).amount_cents), 5000, 'teto');
    const s2 = await scene(db, { ruleOpts: { min: 200000 } });
    const r2 = await proc(db, s2.ev); eq(r2.result, 'skipped'); eq(r2.reason, 'below_min_base');
  });
  await ok('módulo desligado: evento fica pendente, nada é gravado', async () => {
    const s = await scene(db);
    await db.query(`UPDATE public.commercial_settings SET module_enabled=false WHERE tenant_id=$1`, [s.t]);
    eq((await proc(db, s.ev)).result, 'module_off');
    eq((await row(db, `SELECT status FROM public.commercial_financial_events WHERE id=$1`, [s.ev])).status, 'pending');
    eq((await ledger(db, s.r)).length, 0);
  });

  console.log('\n[3] Quem recebe e qual regra vale');
  await ok('atribuição pendente (ou ausente) não gera comissão; após confirmar, reprocessar gera', async () => {
    const s = await scene(db, { attr: 'pending' });
    const r1 = await proc(db, s.ev); eq(r1.reason, 'no_confirmed_attribution');
    await db.query(`UPDATE public.commercial_attributions SET status='confirmed', confirmed_at=now(), confirmed_by=$2 WHERE business_id=$1`, [s.b, await user(db)]);
    const res = await row(db, `SELECT public.commercial_reprocess_events($1,$2,NULL) AS r`, [s.t, s.b]);
    eq(res.r.reopened, 1); eq(res.r.processed, 1);
    eq((await ledger(db, s.r, 'accrual')).length, 1);
  });
  await ok('sem regra aplicável: evento pulado e recuperável depois de criar a regra', async () => {
    const s = await scene(db, { rate: null });
    eq((await proc(db, s.ev)).reason, 'no_applicable_rule');
    await addRule(db, s.t, { rate: 1000 });
    const res = await row(db, `SELECT public.commercial_reprocess_events($1,NULL,NULL) AS r`, [s.t]);
    eq(res.r.processed, 1);
    eq(Number((await ledger(db, s.r, 'accrual'))[0].amount_cents), 10000);
  });
  await ok('regra ilustrativa, desabilitada, rascunho ou fora da vigência nunca é usada', async () => {
    const s = await scene(db, { rate: null });
    await addRule(db, s.t, { illustrative: true, enabled: false, rate: 5000, priority: 9 });
    await addRule(db, s.t, { status: 'draft', enabled: false, illustrative: false, rate: 5000, priority: 8 });
    await db.query(`UPDATE public.commercial_commission_rules SET approved_by=NULL, approved_at=NULL WHERE status='draft' AND tenant_id=$1`, [s.t]);
    await addRule(db, s.t, { until: new Date(Date.now() - 5 * 86400000).toISOString(), rate: 5000, priority: 7 });
    await addRule(db, s.t, { from: new Date(Date.now() + 86400000 * 5).toISOString(), rate: 5000, priority: 6 });
    eq((await proc(db, s.ev)).reason, 'no_applicable_rule');
  });
  await ok('precedência: representante > categoria > plano padrão; plano específico > qualquer plano; prioridade', async () => {
    const t = await engineTenant(db); const c = await category(db, t); const u = await user(db);
    const r = await rep(db, t, { userId: u }); await db.query(`UPDATE public.commercial_representatives SET category_id=$2 WHERE id=$1`, [r, c]);
    const b = await biz(db, t); await confirmedAttr(db, t, b, r);
    await db.query(`INSERT INTO public.business_commercial_terms (tenant_id, business_id, plan_code, amount_cents) VALUES ($1,$2,'ouro',100000) ON CONFLICT (business_id) DO UPDATE SET plan_code='ouro'`, [t, b]);
    await addRule(db, t, { kind: 'plan_default', rate: 1000 });
    await addRule(db, t, { kind: 'plan_default', plan: 'acacia', rate: 1100 });
    const inv = await paidInvoice(db, t, b); const ev = await pendingEvent(db, inv);
    const first = await proc(db, ev); eq(Number(first.amount_cents), 11000, 'plano específico (ouro = acacia) vence "qualquer plano": ' + JSON.stringify(first));
    const catRule = await addRule(db, t, { kind: 'category_default', cat: c, rate: 1200, type: 'recurring' });
    await addRule(db, t, { kind: 'plan_default', rate: 1000, type: 'recurring' });
    const inv2 = await paidInvoice(db, t, b); const ev2 = await pendingEvent(db, inv2);
    eq(Number((await proc(db, ev2)).amount_cents), 12000, 'categoria vence plano padrão (recorrente)');
    await addRule(db, t, { kind: 'representative_override', rep: r, rate: 1300, type: 'recurring' });
    const inv3 = await paidInvoice(db, t, b); const ev3 = await pendingEvent(db, inv3);
    eq(Number((await proc(db, ev3)).amount_cents), 13000, 'representante vence categoria');
    void catRule;
  });
  await ok('primeira fatura é "initial"; as seguintes são "recurring" (sem regra recorrente = sem comissão)', async () => {
    const s = await scene(db); await proc(db, s.ev);
    const inv2 = await paidInvoice(db, s.t, s.b); const ev2 = await pendingEvent(db, inv2);
    eq((await proc(db, ev2)).reason, 'no_applicable_rule');
  });
  await ok('representante inativo não recebe comissão nova', async () => {
    const s = await scene(db, { repStatus: 'suspended' });
    eq((await proc(db, s.ev)).reason, 'representative_not_active');
  });
  await ok('modalidade não monetária (permuta) nunca gera comissão', async () => {
    const t = await engineTenant(db); const u = await user(db); const r = await rep(db, t, { userId: u }); const b = await biz(db, t);
    await db.query(`INSERT INTO public.business_commercial_terms (tenant_id, business_id, commercial_modality, amount_cents) VALUES ($1,$2,'permuta',0)`, [t, b]);
    await confirmedAttr(db, t, b, r); await addRule(db, t, {});
    const inv = await paidInvoice(db, t, b); const ev = await pendingEvent(db, inv);
    const st = (await row(db, `SELECT status FROM public.commercial_financial_events WHERE id=$1`, [ev])).status;
    eq(st, 'skipped'); eq((await ledger(db, r)).length, 0);
  });
  await ok('evento que exige revisão não é processado até decisão humana (com justificativa)', async () => {
    const s = await scene(db);
    await db.query(`UPDATE public.commercial_financial_events SET requires_review=true WHERE id=$1`, [s.ev]);
    eq((await proc(db, s.ev)).result, 'needs_review');
    eq((await row(db, `SELECT public.commercial_review_event($1,$2,'process','curto',$3) AS r`, [s.t, s.ev, s.u])).r.result, 'note_required');
    const done = await row(db, `SELECT public.commercial_review_event($1,$2,'process','Conferido com o financeiro',$3) AS r`, [s.t, s.ev, s.u]);
    eq(done.r.result, 'accrued');
    const s2 = await scene(db);
    await db.query(`UPDATE public.commercial_financial_events SET requires_review=true WHERE id=$1`, [s2.ev]);
    eq((await row(db, `SELECT public.commercial_review_event($1,$2,'dismiss','Redução indevida, ignorar',$3) AS r`, [s2.t, s2.ev, s2.u])).r.result, 'dismissed');
    eq((await ledger(db, s2.r)).length, 0);
  });

  console.log('\n[4] Estornos e chargebacks');
  await ok('estorno total reverte 100% do crédito e encerra a liberação', async () => {
    const s = await scene(db); await proc(db, s.ev);
    await refund(db, s.t, s.inv, 'refund');
    const res = await procAll(db, s.t); eq(res.processed, 1);
    eq(await sumLedger(db, s.r), 0, 'saldo zerado');
    const [acc] = await ledger(db, s.r, 'accrual'); const [rev] = await ledger(db, s.r, 'reversal');
    eq(rev.reference_entry_id, acc.id); eq(Number(rev.amount_cents), -15000);
    eq((await release(db, acc.id)).status, 'reversed');
  });
  await ok('estornos parciais somam exatamente o crédito (sem diferença de centavos)', async () => {
    const s = await scene(db, { rate: 1234, paid: 1000.01 }); await proc(db, s.ev);
    const accrued = Number((await ledger(db, s.r, 'accrual'))[0].amount_cents);
    for (const cum of [33333, 66666, 100001]) { await refund(db, s.t, s.inv, 'refund', cum, true); await procAll(db, s.t); }
    eq(await sumLedger(db, s.r), 0, `crédito ${accrued} totalmente compensado`);
    for (const rv of await ledger(db, s.r, 'reversal')) if (Number(rv.amount_cents) >= 0) throw new Error('reversal deve ser negativo');
  });
  await ok('estorno parcial reverte proporcionalmente e mantém a liberação', async () => {
    const s = await scene(db); await proc(db, s.ev);
    await refund(db, s.t, s.inv, 'refund', 25000, true); await procAll(db, s.t);
    eq(await sumLedger(db, s.r), 15000 - 3750);
    const [acc] = await ledger(db, s.r, 'accrual'); eq((await release(db, acc.id)).status, 'hold');
  });
  await ok('estorno de venda que nunca teve comissão não cria lançamento', async () => {
    const s = await scene(db, { attr: null });
    await proc(db, s.ev);
    await refund(db, s.t, s.inv, 'refund'); const res = await procAll(db, s.t);
    eq(res.processed, 0); eq((await ledger(db, s.r)).length, 0);
  });
  await ok('estorno vale mesmo se a atribuição foi revogada depois (compensa o que foi creditado)', async () => {
    const s = await scene(db); await proc(db, s.ev);
    await db.query(`UPDATE public.commercial_attributions SET status='revoked', revoked_at=now(), revoke_reason='teste de revogação' WHERE business_id=$1`, [s.b]);
    await refund(db, s.t, s.inv, 'refund'); await procAll(db, s.t);
    eq(await sumLedger(db, s.r), 0);
  });
  await ok('chargeback reverte e a disputa vencida recria a comissão pela mesma regra', async () => {
    const s = await scene(db); await proc(db, s.ev);
    await refund(db, s.t, s.inv, 'chargeback'); await procAll(db, s.t);
    eq(await sumLedger(db, s.r), 0);
    await refund(db, s.t, s.inv, 'chargeback_reversal'); const res = await procAll(db, s.t);
    eq(res.processed, 1);
    eq(await sumLedger(db, s.r), 15000, 'comissão restabelecida');
    const accs = await ledger(db, s.r, 'accrual'); eq(accs.length, 2); eq(accs[0].rule_id, accs[1].rule_id, 'mesma regra');
  });
  await ok('estorno depois da criação do repasse cancela o repasse e libera os itens', async () => {
    const s = await scene(db, { hold: 0 }); await withPix(db, s.r); await proc(db, s.ev); await releaseNow(db, s.t);
    const d = await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u]); eq(d.r.result, 'created');
    await refund(db, s.t, s.inv, 'refund'); await procAll(db, s.t);
    const p = await row(db, `SELECT status, failure_reason FROM public.commercial_payouts WHERE id=$1`, [d.r.payout_id]);
    eq(p.status, 'canceled'); if (!/automaticamente/.test(p.failure_reason)) throw new Error('motivo ausente');
    eq(await count(db, `SELECT 1 FROM public.commercial_payout_items WHERE payout_id='${d.r.payout_id}'`), 0);
  });

  console.log('\n[5] Liberação e repasses');
  await ok('carência: só libera depois da data; liberar é idempotente', async () => {
    const s = await scene(db); await proc(db, s.ev);
    eq((await row(db, `SELECT public.commercial_release_due($1, now()) AS n`, [s.t])).n, 0);
    eq(await releaseNow(db, s.t), 1);
    eq(await releaseNow(db, s.t), 0);
  });
  await ok('repasse: rascunho exige PIX e crédito liberado; um aberto por representante', async () => {
    const s = await scene(db, { hold: 0 }); await proc(db, s.ev);
    eq((await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r.result, 'missing_pix');
    await withPix(db, s.r);
    eq((await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r.result, 'nothing_to_pay');
    await releaseNow(db, s.t);
    const d = await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u]);
    eq(d.r.result, 'created'); eq(Number(d.r.amount_cents), 15000);
    eq((await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r.result, 'open_payout_exists');
  });
  await ok('fluxo completo: aprovar por OUTRA pessoa, pagar com comprovante, saldo zera, não paga duas vezes', async () => {
    const s = await scene(db, { hold: 0 }); await withPix(db, s.r); await proc(db, s.ev); await releaseNow(db, s.t);
    const d = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r;
    eq((await row(db, `SELECT public.commercial_approve_payout($1,$2,$3,false) AS r`, [s.t, d.payout_id, s.u])).r.result, 'same_person');
    const approver = await user(db);
    eq((await row(db, `SELECT public.commercial_approve_payout($1,$2,$3,false) AS r`, [s.t, d.payout_id, approver])).r.result, 'approved');
    eq((await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,NULL,NULL) AS r`, [s.t, d.payout_id, approver])).r.result, 'proof_required');
    const wrong = await proofDoc(db, s.t, s.r, 'identity');
    eq((await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [s.t, d.payout_id, approver, wrong])).r.result, 'proof_required');
    const other = await rep(db, s.t, { status: 'active', userId: await user(db) });
    const foreign = await proofDoc(db, s.t, other);
    eq((await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [s.t, d.payout_id, approver, foreign])).r.result, 'proof_required');
    const proof = await proofDoc(db, s.t, s.r);
    const paid = (await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,'E2E123') AS r`, [s.t, d.payout_id, approver, proof])).r;
    eq(paid.result, 'paid'); eq(await sumLedger(db, s.r), 0, 'saldo zerado após o repasse');
    const [acc] = await ledger(db, s.r, 'accrual'); eq((await release(db, acc.id)).status, 'paid');
    eq((await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [s.t, d.payout_id, approver, proof])).r.result, 'invalid_status');
    eq((await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r.result, 'nothing_to_pay');
  });
  await ok('cancelar exige justificativa, devolve os itens e permite novo rascunho; pago não cancela', async () => {
    const s = await scene(db, { hold: 0 }); await withPix(db, s.r); await proc(db, s.ev); await releaseNow(db, s.t);
    const d = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r;
    eq((await row(db, `SELECT public.commercial_cancel_payout($1,$2,$3,'curto') AS r`, [s.t, d.payout_id, s.u])).r.result, 'reason_required');
    eq((await row(db, `SELECT public.commercial_cancel_payout($1,$2,$3,'Dados bancários incorretos') AS r`, [s.t, d.payout_id, s.u])).r.result, 'canceled');
    eq((await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [s.t, s.r, s.u])).r.result, 'created');
  });
  await ok('estorno de comissão JÁ PAGA vira clawback e é abatido do próximo repasse', async () => {
    const t = await engineTenant(db); const u = await user(db); const r = await rep(db, t, { userId: u }); await withPix(db, r);
    const b = await biz(db, t); await confirmedAttr(db, t, b, r); await addRule(db, t, { hold: 0 }); await addRule(db, t, { hold: 0, type: 'recurring' });
    const inv1 = await paidInvoice(db, t, b); await proc(db, await pendingEvent(db, inv1)); await releaseNow(db, t);
    const d1 = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [t, r, u])).r;
    const approver = await user(db);
    await row(db, `SELECT public.commercial_approve_payout($1,$2,$3,false) AS r`, [t, d1.payout_id, approver]);
    await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [t, d1.payout_id, approver, await proofDoc(db, t, r)]);
    // estorno depois do pagamento
    await refund(db, t, inv1, 'refund', 40000, true); await procAll(db, t);
    eq(await count(db, `SELECT 1 FROM public.commercial_clawbacks WHERE representative_id='${r}' AND offset_payout_id IS NULL`), 1, 'clawback aberto');
    eq(await sumLedger(db, r), -6000, 'saldo negativo = débito do representante');
    // nova venda: o repasse seguinte desconta o débito
    const b2 = await biz(db, t); await confirmedAttr(db, t, b2, r);
    const inv2 = await paidInvoice(db, t, b2); await procAll(db, t); await releaseNow(db, t);
    const d2 = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [t, r, u])).r;
    eq(d2.result, 'created'); eq(Number(d2.gross_cents), 15000); eq(Number(d2.deductions_cents), 6000); eq(Number(d2.amount_cents), 9000);
    await row(db, `SELECT public.commercial_approve_payout($1,$2,$3,false) AS r`, [t, d2.payout_id, approver]);
    await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [t, d2.payout_id, approver, await proofDoc(db, t, r)]);
    eq(await sumLedger(db, r), 0, 'tudo conciliado: nada devido nem a receber');
    void inv2;
  });
  await ok('cancelar o repasse devolve o clawback abatido', async () => {
    const t = await engineTenant(db); const u = await user(db); const r = await rep(db, t, { userId: u }); await withPix(db, r);
    const b = await biz(db, t); await confirmedAttr(db, t, b, r); await addRule(db, t, { hold: 0 }); await addRule(db, t, { hold: 0, type: 'recurring' });
    const inv1 = await paidInvoice(db, t, b); await proc(db, await pendingEvent(db, inv1)); await releaseNow(db, t);
    const d1 = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [t, r, u])).r; const approver = await user(db);
    await row(db, `SELECT public.commercial_approve_payout($1,$2,$3,false) AS r`, [t, d1.payout_id, approver]);
    await row(db, `SELECT public.commercial_mark_payout_paid($1,$2,$3,$4,NULL) AS r`, [t, d1.payout_id, approver, await proofDoc(db, t, r)]);
    await refund(db, t, inv1, 'refund', 40000, true); await procAll(db, t);
    const b2 = await biz(db, t); await confirmedAttr(db, t, b2, r); await paidInvoice(db, t, b2); await procAll(db, t); await releaseNow(db, t);
    const d2 = (await row(db, `SELECT public.commercial_create_payout_draft($1,$2,$3,NULL) AS r`, [t, r, u])).r;
    eq(await count(db, `SELECT 1 FROM public.commercial_clawbacks WHERE offset_payout_id IS NULL AND representative_id='${r}'`), 0);
    await row(db, `SELECT public.commercial_cancel_payout($1,$2,$3,'Cancelamento para teste') AS r`, [t, d2.payout_id, u]);
    eq(await count(db, `SELECT 1 FROM public.commercial_clawbacks WHERE offset_payout_id IS NULL AND representative_id='${r}'`), 1);
  });

  console.log('\n[6] Fechamento de período');
  await ok('fechamento: recusa com eventos pendentes, futuro e sobreposição; congela totais', async () => {
    const s = await scene(db);
    const start = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10);
    const res1 = (await row(db, `SELECT public.commercial_close_period($1,$2,$3,$4) AS r`, [s.t, start, end, s.u])).r; eq(res1.result, 'period_not_finished');
    const endOk = new Date(Date.now() - 0 * 86400000).toISOString().slice(0, 10);
    const res2 = (await row(db, `SELECT public.commercial_close_period($1,$2,$3,$4) AS r`, [s.t, start, endOk, s.u])).r; eq(res2.result, 'pending_events');
    await procAll(db, s.t);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    // período que cobre o evento (hoje-1d): fecha com totais
    const start2 = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const res3 = (await row(db, `SELECT public.commercial_close_period($1,$2,$3,$4) AS r`, [s.t, start2, endOk, s.u])).r;
    eq(res3.result, 'closed'); eq(Number(res3.totals.accrued_cents), 15000);
    eq((await row(db, `SELECT public.commercial_close_period($1,$2,$3,$4) AS r`, [s.t, start2, endOk, s.u])).r.result, 'overlaps_existing_period');
    void tomorrow;
  });

  console.log('\n[7] Rollback');
  await ok('rollback recusa com lançamentos/categorias; limpo remove e reaplica', async () => {
    const d = await freshDb(); const s = await scene(d); await proc(d, s.ev);
    let refused = null; try { await d.exec(read('supabase/rollbacks/commercial/243_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria recusar');
    const d2 = await freshDb();
    await d2.exec(read('supabase/rollbacks/commercial/243_rollback.sql'));
    eq(await count(d2, `SELECT 1 FROM pg_proc WHERE proname='commercial_process_financial_event'`), 0);
    eq(await count(d2, `SELECT 1 FROM information_schema.tables WHERE table_name='commercial_representative_categories'`), 0);
    await d2.exec(read('supabase/migrations/243_commercial_commission_engine.sql'));
    eq(await count(d2, `SELECT 1 FROM pg_proc WHERE proname='commercial_process_financial_event'`), 1);
  });

  console.log('\n================================================================');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
}

main().catch((e) => { console.error('ERRO FATAL NA SUÍTE:', e); process.exit(1); });
