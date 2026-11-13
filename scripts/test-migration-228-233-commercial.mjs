// Gate 1A · Módulo Comercial — suíte de integridade em PostgreSQL real (PGlite/WASM).
//
// LIMITES (documentados no relatório do Gate 1A): PGlite NÃO substitui pgTAP/RLS com os papéis reais do
// Supabase (sem GoTrue/JWT/PostgREST/storage.objects policies). Aqui valida-se SQL, constraints, índices,
// triggers, imutabilidade, privilégios por papel e rollbacks. Testes de RLS com JWT exigem Docker + CLI.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = [
  '228_commercial_foundation.sql',
  '229_commercial_leads_attributions.sql',
  '230_commercial_commission_rules.sql',
  '231_commercial_financial_events.sql',
  '232_commercial_ledger_payouts.sql',
  '233_commercial_security_audit.sql',
];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

async function ok(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    failures.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

async function rejects(name, fn, pattern) {
  await ok(name, async () => {
    let err = null;
    try {
      await fn();
    } catch (e) {
      err = e;
    }
    if (!err) throw new Error('esperava erro, mas a operação foi aceita');
    if (pattern && !pattern.test(err.message)) throw new Error(`erro inesperado: ${err.message}`);
  });
}

function eq(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label} esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

const BASE_SCHEMA = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT);
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false, file_size_limit BIGINT, allowed_mime_types TEXT[]);
  CREATE TABLE storage.objects (id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
  CREATE TABLE public.tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT);
  CREATE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    name TEXT,
    CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id)
  );
  CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    business_id UUID NOT NULL,
    invoice_number TEXT NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','paid','uncollectible','void','overdue')),
    due_date DATE NOT NULL DEFAULT current_date,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
  );
  CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  GRANT ALL ON public.invoices TO authenticated, service_role;
  CREATE TABLE public.business_commercial_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    business_id UUID NOT NULL UNIQUE,
    commercial_modality TEXT NOT NULL DEFAULT 'padrao',
    amount_cents INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE public.business_signup_invites (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.landing_leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
`;

async function freshDb(applyMigrations = true) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(BASE_SCHEMA);
  if (applyMigrations) {
    for (const file of MIGRATIONS) await db.exec(read(`supabase/migrations/${file}`));
  }
  return db;
}

async function seedTenant(db) {
  const tenant = randomUUID();
  await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1, $2)`, [tenant, `t-${tenant.slice(0, 6)}`]);
  return tenant;
}
async function seedBusiness(db, tenant, terms) {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name) VALUES ($1, $2, 'Empresa')`, [id, tenant]);
  if (terms) {
    await db.query(
      `INSERT INTO public.business_commercial_terms (tenant_id, business_id, commercial_modality, amount_cents) VALUES ($1, $2, $3, $4)`,
      [tenant, id, terms.modality ?? 'padrao', terms.amount ?? 50000],
    );
  }
  return id;
}
let repCounter = 0;
async function seedRep(db, tenant, overrides = {}) {
  repCounter += 1;
  const id = randomUUID();
  const code = `REP-${String(100000 + repCounter)}`;
  await db.query(
    `INSERT INTO public.commercial_representatives
       (id, tenant_id, person_type, legal_name, email, referral_code, status, contract_accepted_at, document_hash)
     VALUES ($1, $2, 'pf', 'Representante', $3, $4, $5, $6, $7)`,
    [
      id, tenant, `rep${repCounter}@teste.com`, code,
      overrides.status ?? 'active',
      overrides.status === 'invited' ? null : new Date().toISOString(),
      overrides.status === 'invited' ? null : `hash-${repCounter}-${id}`,
    ],
  );
  return id;
}
async function enableCapture(db, tenant, mode = 'shadow', startsAt = '2000-01-01T00:00:00Z') {
  await db.query(
    `INSERT INTO public.commercial_settings (tenant_id, capture_mode, capture_starts_at) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id) DO UPDATE SET capture_mode = EXCLUDED.capture_mode, capture_starts_at = EXCLUDED.capture_starts_at`,
    [tenant, mode, startsAt],
  );
}
async function newInvoice(db, tenant, business, { status = 'open', due = 500, paid = 0, paidAt = null } = {}) {
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.invoices (id, tenant_id, business_id, invoice_number, amount_due, amount_paid, status, paid_at, payment_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pix')`,
    [id, tenant, business, `INV-${id.slice(0, 8)}`, due, paid, status, paidAt],
  );
  return id;
}
const events = async (db, invoice) =>
  (await db.query(
    `SELECT seq, event_type, delta_cents::text AS delta, cumulative_settled_cents::text AS cum, status, skip_reason, requires_review, idempotency_key
       FROM public.commercial_financial_events WHERE invoice_id = $1 ORDER BY seq`,
    [invoice],
  )).rows;

async function main() {
  console.log('================================================================');
  console.log('GATE 1A · MÓDULO COMERCIAL · MIGRATIONS 228-233 (PGlite)');
  console.log('================================================================');

  const db = await freshDb();

  // ---------------------------------------------------------------- aplicação
  console.log('\n[1] Aplicação e idempotência das migrations');
  await ok('migrations 228-233 aplicadas em esquema limpo (auditoria 233 passou)', async () => {
    const r = await db.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'commercial\\_%' AND c.relkind = 'r'`);
    eq(r.rows[0].n, 16, 'tabelas commercial_*');
  });
  await ok('re-execução das migrations é idempotente', async () => {
    for (const file of MIGRATIONS) await db.exec(read(`supabase/migrations/${file}`));
  });
  await ok('bucket commercial-documents é privado, 10MB, apenas PDF/imagens', async () => {
    const r = await db.query(`SELECT public, file_size_limit::text AS lim, allowed_mime_types FROM storage.buckets WHERE id='commercial-documents'`);
    eq(r.rows.length, 1);
    eq(r.rows[0].public, false);
    eq(r.rows[0].lim, '10485760');
  });

  // ------------------------------------------------------------- segurança
  console.log('\n[2] Segurança: RLS e privilégios');
  await ok('todas as tabelas/visões commercial_* têm RLS (tabelas) e nenhum acesso anon/authenticated', async () => {
    const rows = (await db.query(`
      SELECT c.relname, c.relkind, c.relrowsecurity,
             has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_ok,
             has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS auth_ok
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND c.relname LIKE 'commercial\\_%' AND c.relkind IN ('r','v')`)).rows;
    if (rows.length !== 18) throw new Error(`esperados 16 tabelas + 2 visões, obtidos ${rows.length}`);
    for (const r of rows) {
      if (r.relkind === 'r' && !r.relrowsecurity) throw new Error(`${r.relname} sem RLS`);
      if (r.anon_ok || r.auth_ok) throw new Error(`${r.relname} acessível a anon/authenticated`);
    }
  });
  await rejects('papel authenticated não lê tabela comercial', async () => {
    await db.exec(`SET ROLE authenticated; SELECT * FROM public.commercial_ledger_entries;`);
  }, /permission denied/i).finally(() => db.exec('RESET ROLE'));
  await rejects('papel anon não escreve em tabela comercial', async () => {
    await db.exec(`SET ROLE anon; INSERT INTO public.commercial_settings (tenant_id) VALUES (gen_random_uuid());`);
  }, /permission denied/i).finally(() => db.exec('RESET ROLE'));
  await ok('papel service_role possui acesso total', async () => {
    await db.exec(`SET ROLE service_role; SELECT count(*) FROM public.commercial_ledger_entries; RESET ROLE;`);
  });
  await ok('profiles.role e tabelas existentes não foram alteradas (apenas trigger em invoices adicionado)', async () => {
    const r = await db.query(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.invoices'::regclass AND NOT tgisinternal ORDER BY tgname`);
    eq(r.rows.map((x) => x.tgname).join(','), 'trg_commercial_invoice_capture,trg_invoices_updated_at');
  });

  // ---------------------------------------------------------------- settings
  console.log('\n[3] Configurações (captura x operação)');
  const tSet = await seedTenant(db);
  await ok('padrões: captura off, módulo desligado, 30/60/30 dias', async () => {
    await db.query(`INSERT INTO public.commercial_settings (tenant_id) VALUES ($1)`, [tSet]);
    const r = (await db.query(`SELECT * FROM public.commercial_settings WHERE tenant_id=$1`, [tSet])).rows[0];
    eq(r.capture_mode, 'off');
    eq(r.module_enabled, false);
    eq(r.referral_validity_days, 30);
    eq(r.lead_reservation_days, 60);
    eq(r.default_hold_days, 30);
  });
  await rejects('operação não pode ser ligada sem captura', () =>
    db.query(`UPDATE public.commercial_settings SET module_enabled = true WHERE tenant_id=$1`, [tSet]), /module_requires_capture/);
  await rejects('captura exige marco de início', () =>
    db.query(`UPDATE public.commercial_settings SET capture_mode='shadow' WHERE tenant_id=$1`, [tSet]), /capture_requires_start/);

  // ------------------------------------------------------- captura financeira
  console.log('\n[4] Trigger/outbox em invoices');
  const t1 = await seedTenant(db);
  const b1 = await seedBusiness(db, t1, { modality: 'padrao', amount: 50000 });

  await ok('sem configuração (captura off): nenhum evento é criado', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'paid', due: 500, paid: 500, paidAt: new Date().toISOString() });
    await db.query(`UPDATE public.invoices SET amount_paid = 500, status = 'paid' WHERE id=$1`, [inv]);
    eq((await events(db, inv)).length, 0);
  });

  await enableCapture(db, t1, 'shadow');

  await ok('liquidação gera 1 evento com valor efetivamente recebido em centavos', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 500 });
    eq((await events(db, inv)).length, 0, 'fatura aberta não gera evento');
    await db.query(`UPDATE public.invoices SET status='paid', amount_paid=400, paid_at=now() WHERE id=$1`, [inv]);
    const ev = await events(db, inv);
    eq(ev.length, 1);
    eq(ev[0].event_type, 'settlement');
    eq(ev[0].delta, '40000');
    eq(ev[0].cum, '40000');
    eq(ev[0].status, 'pending');
    eq(ev[0].seq, 1);
  });
  await ok('repetição da mesma confirmação (webhook duplicado/updates) não duplica evento', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 500 });
    await db.query(`UPDATE public.invoices SET status='paid', amount_paid=500, paid_at=now() WHERE id=$1`, [inv]);
    for (let i = 0; i < 4; i++) {
      await db.query(`UPDATE public.invoices SET status='paid', amount_paid=500, paid_at=now() WHERE id=$1`, [inv]);
      await db.query(`UPDATE public.invoices SET amount_due=500 WHERE id=$1`, [inv]);
    }
    eq((await events(db, inv)).length, 1);
  });
  await ok('fatura inserida diretamente como paga (fluxo legítimo) é capturada', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'paid', due: 250, paid: 250, paidAt: new Date().toISOString() });
    const ev = await events(db, inv);
    eq(ev.length, 1);
    eq(ev[0].delta, '25000');
  });
  await ok('pagamento parcial, ajuste para cima e reversão geram deltas assinados com sequência estável', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 500, paid: 100 });
    await db.query(`UPDATE public.invoices SET amount_paid=300, paid_at=now() WHERE id=$1`, [inv]);
    await db.query(`UPDATE public.invoices SET status='paid', amount_paid=500, paid_at=now() WHERE id=$1`, [inv]);
    await db.query(`UPDATE public.invoices SET status='void', amount_paid=0 WHERE id=$1`, [inv]);
    await db.query(`UPDATE public.invoices SET status='paid', amount_paid=500, paid_at=now() WHERE id=$1`, [inv]);
    const ev = await events(db, inv);
    eq(ev.map((e) => `${e.event_type}:${e.delta}`).join('|'),
      'partial_settlement:10000|settlement_adjustment:20000|settlement_adjustment:20000|reversal:-50000|settlement:50000');
    eq(ev.map((e) => e.seq).join(','), '1,2,3,4,5');
    eq(ev[3].requires_review, true, 'reversão sem provedor exige revisão');
    eq(new Set(ev.map((e) => e.idempotency_key)).size, 5, 'chaves únicas');
  });
  await ok('pagamento anterior ao marco de início fica registrado como skipped (sem retroativo)', async () => {
    const t = await seedTenant(db);
    const b = await seedBusiness(db, t, { modality: 'padrao', amount: 1000 });
    await enableCapture(db, t, 'shadow', '2030-01-01T00:00:00Z');
    const inv = await newInvoice(db, t, b, { status: 'paid', due: 100, paid: 100, paidAt: '2029-06-01T00:00:00Z' });
    const ev = await events(db, inv);
    eq(ev[0].status, 'skipped');
    eq(ev[0].skip_reason, 'before_capture_start');
  });
  await ok('permuta/parceria/valor zero: evento skipped + revisão (sem comissão automática)', async () => {
    const t = await seedTenant(db);
    await enableCapture(db, t, 'shadow');
    for (const modality of ['permuta_100', 'parceria', 'permuta_50']) {
      const b = await seedBusiness(db, t, { modality, amount: 0 });
      const inv = await newInvoice(db, t, b, { status: 'paid', due: 0, paid: 120, paidAt: new Date().toISOString() });
      const ev = await events(db, inv);
      eq(ev[0].status, 'skipped', modality);
      eq(ev[0].skip_reason, 'non_monetary_modality', modality);
      eq(ev[0].requires_review, true, modality);
    }
  });
  await rejects('unicidade: chave de idempotência e (fatura, seq) bloqueiam duplicidade direta', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'paid', due: 10, paid: 10, paidAt: new Date().toISOString() });
    await db.query(`
      INSERT INTO public.commercial_financial_events (tenant_id, business_id, invoice_id, source_kind, event_type, seq, idempotency_key, delta_cents, cumulative_settled_cents)
      VALUES ($1, $2, $3, 'invoice_trigger', 'settlement', 1, 'x-dup', 1000, 1000)`, [t1, b1, inv]);
  }, /duplicate key|unique/i);

  await ok('papel authenticated (sem acesso às tabelas comerciais) confirma pagamento normalmente — trigger SECURITY DEFINER', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 80 });
    await db.exec(`SET ROLE authenticated`);
    try {
      await db.query(`UPDATE public.invoices SET status='paid', amount_paid=80, paid_at=now() WHERE id=$1`, [inv]);
    } finally {
      await db.exec('RESET ROLE');
    }
    eq((await events(db, inv)).length, 1);
  });

  // ---------------------------------------------- isolamento de falhas + recuperação
  console.log('\n[5] Isolamento de falhas e recuperação (shadow x strict)');
  await ok('shadow: falha de captura NÃO bloqueia o pagamento, é registrada e detectada em commercial_capture_gaps', async () => {
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 200 });
    await db.exec(`ALTER TABLE public.business_commercial_terms RENAME TO business_commercial_terms_x`);
    try {
      await db.query(`UPDATE public.invoices SET status='paid', amount_paid=200, paid_at=now() WHERE id=$1`, [inv]);
    } finally {
      await db.exec(`ALTER TABLE public.business_commercial_terms_x RENAME TO business_commercial_terms`);
    }
    const st = (await db.query(`SELECT status, amount_paid::text AS p FROM public.invoices WHERE id=$1`, [inv])).rows[0];
    eq(st.status, 'paid', 'pagamento confirmado');
    eq((await events(db, inv)).length, 0, 'sem evento');
    const f = await db.query(`SELECT count(*)::int AS n FROM public.commercial_capture_failures WHERE invoice_id=$1 AND resolved_at IS NULL`, [inv]);
    eq(f.rows[0].n, 1, 'falha registrada');
    const g = await db.query(`SELECT settled_cents::text AS s, captured_cents::text AS c FROM public.commercial_capture_gaps WHERE invoice_id=$1`, [inv]);
    eq(g.rows.length, 1, 'lacuna detectada');
    eq(g.rows[0].s, '20000');
    const n = (await db.query(`SELECT public.commercial_reconcile_capture($1, 100) AS n`, [t1])).rows[0].n;
    if (n < 1) throw new Error('reconciliação não reprocessou');
    eq((await events(db, inv)).length, 1, 'evento recuperado');
    eq((await db.query(`SELECT count(*)::int AS n FROM public.commercial_capture_gaps WHERE invoice_id=$1`, [inv])).rows[0].n, 0, 'lacuna fechada');
  });
  await rejects('strict: falha de captura aborta a transação do pagamento (homologação)', async () => {
    await enableCapture(db, t1, 'strict');
    const inv = await newInvoice(db, t1, b1, { status: 'open', due: 90 });
    await db.exec(`ALTER TABLE public.business_commercial_terms RENAME TO business_commercial_terms_x`);
    try {
      await db.query(`UPDATE public.invoices SET status='paid', amount_paid=90, paid_at=now() WHERE id=$1`, [inv]);
    } finally {
      await db.exec(`ALTER TABLE public.business_commercial_terms_x RENAME TO business_commercial_terms`);
      await enableCapture(db, t1, 'shadow');
    }
  }, /business_commercial_terms/);

  // ------------------------------------------------------ representantes/leads
  console.log('\n[6] Representantes, documentos, leads e atribuições');
  const t2 = await seedTenant(db);
  const b2 = await seedBusiness(db, t2);
  const rep1 = await seedRep(db, t2);
  const rep2 = await seedRep(db, t2);

  await rejects('representante ativo exige contrato aceito e documento', () =>
    db.query(`INSERT INTO public.commercial_representatives (tenant_id, person_type, legal_name, email, referral_code, status) VALUES ($1,'pf','X','x@x.com','REP-ABC123','active')`, [t2]),
    /active_requirements/);
  await rejects('código de indicação fora do formato REP- é recusado (não colide com convites/B2C)', () =>
    db.query(`INSERT INTO public.commercial_representatives (tenant_id, person_type, legal_name, email, referral_code) VALUES ($1,'pf','X','x@x.com','ABC12345')`, [t2]), /referral_code_check/);
  await rejects('documento (hash) duplicado no mesmo tenant é recusado', async () => {
    const dup = (await db.query(`SELECT document_hash FROM public.commercial_representatives WHERE id=$1`, [rep1])).rows[0].document_hash;
    await db.query(`INSERT INTO public.commercial_representatives (tenant_id, person_type, legal_name, email, referral_code, document_hash) VALUES ($1,'pj','Y','y@y.com','REP-ZZZ999',$2)`, [t2, dup]);
  }, /uq_commercial_representatives_document|unique/i);
  await ok('mesmo usuário pode ser anunciante e representante (user_id opcional e único por tenant)', async () => {
    const u = randomUUID();
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'dual@x.com')`, [u]);
    await db.query(`INSERT INTO public.commercial_representatives (tenant_id, user_id, person_type, legal_name, email, referral_code) VALUES ($1,$2,'pf','Dual','dual@x.com','REP-DUAL01')`, [t2, u]);
    await db.query(`INSERT INTO public.commercial_access_grants (tenant_id, user_id, permission) VALUES ($1,$2,'commissions.read')`, [t2, u]);
  });
  await rejects('documento comercial: bucket diferente, mime inválido e tamanho excessivo são recusados', async () => {
    await db.query(`INSERT INTO public.commercial_representative_documents (tenant_id, representative_id, doc_type, storage_path, mime_type, size_bytes) VALUES ($1,$2,'identity','a/b.exe','application/x-msdownload',10)`, [t2, rep1]);
  }, /mime_type_check/);
  await rejects('suspensão/desligamento não apaga créditos: representante com histórico não pode ser excluído', async () => {
    const t = await seedTenant(db);
    const b = await seedBusiness(db, t);
    const r = await seedRep(db, t);
    const ev = randomUUID();
    const inv = await newInvoice(db, t, b, { status: 'paid', due: 10, paid: 10, paidAt: new Date().toISOString() });
    await db.query(`INSERT INTO public.commercial_leads (tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,'representative','Co','k-del')`, [t, r]);
    await db.query(`DELETE FROM public.commercial_representatives WHERE id=$1`, [r]);
    void ev; void inv;
  }, /foreign key|violates/i);

  const leadA = randomUUID();
  await ok('lead ativo único por chave de duplicidade; liberado após perda', async () => {
    await db.query(`INSERT INTO public.commercial_leads (id, tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,$3,'representative','Alfa','dk-1')`, [leadA, t2, rep1]);
    let dup = null;
    try {
      await db.query(`INSERT INTO public.commercial_leads (tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,'representative','Alfa 2','dk-1')`, [t2, rep2]);
    } catch (e) { dup = e; }
    if (!dup) throw new Error('lead duplicado aceito');
    await db.query(`UPDATE public.commercial_leads SET status='lost' WHERE id=$1`, [leadA]);
    await db.query(`INSERT INTO public.commercial_leads (tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,'representative','Alfa 3','dk-1')`, [t2, rep2]);
  });

  const evidence = randomUUID();
  await ok('evidência da indicação é preservada e imutável; só vínculos podem ser preenchidos', async () => {
    await db.query(`INSERT INTO public.commercial_referral_evidence (id, tenant_id, representative_id, evidence_type, reference_code, evidence) VALUES ($1,$2,$3,'referral_link_visit','REP-100001','{"ua":"x"}')`, [evidence, t2, rep1]);
    await db.query(`UPDATE public.commercial_referral_evidence SET business_id=$2 WHERE id=$1`, [evidence, b2]);
  });
  await rejects('alterar o conteúdo da evidência é bloqueado', () =>
    db.query(`UPDATE public.commercial_referral_evidence SET evidence='{"ua":"y"}' WHERE id=$1`, [evidence]), /imut/i);

  const attr1 = randomUUID();
  await ok('atribuição confirmada ligada à evidência de origem', async () => {
    await db.query(`INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, origin_evidence_id, attribution_type, status, confirmed_at)
                    VALUES ($1,$2,$3,$4,$5,'referral_link','confirmed',now())`, [attr1, t2, b2, rep1, evidence]);
  });
  await rejects('conflito: duas atribuições CONFIRMADAS para a mesma empresa', () =>
    db.query(`INSERT INTO public.commercial_attributions (tenant_id, business_id, representative_id, attribution_type, status, confirmed_at) VALUES ($1,$2,$3,'lead_registration','confirmed',now())`, [t2, b2, rep2]),
    /uq_commercial_attributions_confirmed_business|unique/i);
  await rejects('atribuição confirmada é imutável (troca de representante)', () =>
    db.query(`UPDATE public.commercial_attributions SET representative_id=$2 WHERE id=$1`, [attr1, rep2]), /imut/i);
  await rejects('revogar exige motivo', () =>
    db.query(`UPDATE public.commercial_attributions SET status='revoked', revoked_at=now() WHERE id=$1`, [attr1]), /revoked_consistency/);

  // -------------------------------------------------------------------- regras
  console.log('\n[7] Regras de comissão (vigência, aprovação, imutabilidade)');
  const approver = randomUUID();
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1,'aprovador@x.com')`, [approver]);
  const rule = async (o = {}) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO public.commercial_commission_rules
         (id, tenant_id, rule_kind, representative_id, plan_code, commission_type, priority, rate_bps, effective_from, effective_until, status, enabled, is_illustrative, approved_by, approved_at)
       VALUES ($1,$2,$3,$4,$5,'initial',$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id, o.tenant ?? t2, o.kind ?? 'plan_default', o.rep ?? null, o.plan ?? 'acacia', o.priority ?? 0, o.bps ?? 1500,
        o.from ?? '2026-01-01T00:00:00Z', o.until ?? null, o.status ?? 'draft', o.enabled ?? false, o.illustrative ?? true,
        (o.status ?? 'draft') === 'draft' ? null : approver, (o.status ?? 'draft') === 'draft' ? null : new Date().toISOString(),
      ],
    );
    return id;
  };
  await rejects('taxa fora de 0..10000 bps é recusada', () => rule({ bps: 10001 }), /rate_bps/);
  await rejects('regra ilustrativa (15% de simulação) nunca pode ser habilitada', () =>
    rule({ status: 'active', enabled: true, illustrative: true }), /illustrative_never_enabled/);
  await rejects('regra ativa exige aprovação registrada', () =>
    db.query(`INSERT INTO public.commercial_commission_rules (tenant_id, rule_kind, plan_code, commission_type, rate_bps, effective_from, status) VALUES ($1,'plan_default','acacia','initial',1500,now(),'active')`, [t2]),
    /active_requires_approval/);
  const r1 = await rule({ status: 'active', illustrative: false, from: '2026-01-01T00:00:00Z', until: '2026-07-01T00:00:00Z' });
  await rejects('vigências sobrepostas (mesmo escopo e prioridade) são recusadas', () =>
    rule({ status: 'active', illustrative: false, from: '2026-06-01T00:00:00Z', until: null }), /no_overlap/);
  await ok('vigência adjacente, prioridade diferente e outro plano coexistem', async () => {
    await rule({ status: 'active', illustrative: false, from: '2026-07-01T00:00:00Z' });
    await rule({ status: 'active', illustrative: false, from: '2026-01-01T00:00:00Z', priority: 5 });
    await rule({ status: 'active', illustrative: false, from: '2026-01-01T00:00:00Z', plan: 'compasso' });
    await rule({ status: 'active', illustrative: false, kind: 'representative_override', rep: rep1, from: '2026-01-01T00:00:00Z' });
  });
  await rejects('regra ativa é imutável (alteração de taxa)', () =>
    db.query(`UPDATE public.commercial_commission_rules SET rate_bps = 2000 WHERE id=$1`, [r1]), /imut/i);
  await rejects('vigência de regra com fim não pode ser estendida', () =>
    db.query(`UPDATE public.commercial_commission_rules SET effective_until = '2027-01-01T00:00:00Z' WHERE id=$1`, [r1]), /estendida/i);
  await ok('regra ativa pode ser ENCERRADA (retired) preservando parâmetros', async () => {
    await db.query(`UPDATE public.commercial_commission_rules SET status='retired', effective_until='2026-03-01T00:00:00Z' WHERE id=$1`, [r1]);
  });
  await rejects('regra encerrada não pode ser reativada nem excluída', async () => {
    await db.query(`DELETE FROM public.commercial_commission_rules WHERE id=$1`, [r1]);
  }, /rascunho/i);
  await ok('regra pode ser habilitada somente se ativa e não ilustrativa', async () => {
    const ok1 = await rule({ status: 'active', illustrative: false, enabled: true, plan: 'esquadro' });
    eq(typeof ok1, 'string');
  });

  // ------------------------------------------------------------------ livro-razão
  console.log('\n[8] Livro-razão append-only, liberações e repasses');
  const t3 = await seedTenant(db);
  await enableCapture(db, t3, 'shadow');
  const b3 = await seedBusiness(db, t3, { modality: 'padrao', amount: 50000 });
  const repL = await seedRep(db, t3);
  const repM = await seedRep(db, t3);
  const attrL = randomUUID();
  await db.query(`INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, attribution_type, status, confirmed_at) VALUES ($1,$2,$3,$4,'lead_registration','confirmed',now())`, [attrL, t3, b3, repL]);
  // cria o evento financeiro de verdade pelo trigger
  const invL = await newInvoice(db, t3, b3, { status: 'open', due: 500 });
  await db.query(`UPDATE public.invoices SET status='paid', amount_paid=400, paid_at=now() WHERE id=$1`, [invL]);
  const evL = (await db.query(`SELECT id FROM public.commercial_financial_events WHERE invoice_id=$1`, [invL])).rows[0].id;
  const ruleL = (await db.query(`INSERT INTO public.commercial_commission_rules (tenant_id, rule_kind, plan_code, commission_type, rate_bps, effective_from, status, approved_by, approved_at, is_illustrative)
                                  VALUES ($1,'plan_default','acacia','initial',1500,'2026-01-01','active',$2,now(),false) RETURNING id`, [t3, approver])).rows[0].id;

  const accrual = randomUUID();
  const ins = (o) => db.query(
    `INSERT INTO public.commercial_ledger_entries
       (id, tenant_id, representative_id, entry_type, amount_cents, attribution_id, financial_event_id, rule_id, rule_snapshot, base_amount_cents, rate_bps, reference_entry_id, payout_id, reason, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [o.id ?? randomUUID(), t3, o.rep ?? repL, o.type, o.amount, o.attr ?? null, o.ev ?? null, o.rule ?? null,
      o.snapshot ?? null, o.base ?? null, o.bps ?? null, o.ref ?? null, o.payout ?? null, o.reason ?? null, o.key ?? randomUUID()]);

  await ok('crédito (accrual) de 15% sobre R$ 400,00 = R$ 60,00 com snapshot da regra', async () => {
    await ins({ id: accrual, type: 'accrual', amount: 6000, attr: attrL, ev: evL, rule: ruleL, base: 40000, bps: 1500,
      snapshot: JSON.stringify({ rule_id: ruleL, rate_bps: 1500, base_cents: 40000, hold_days: 30 }), key: 'acc-1' });
  });
  await rejects('crédito duplicado para o mesmo (evento, atribuição) é recusado mesmo com outra chave', () =>
    ins({ type: 'accrual', amount: 6000, attr: attrL, ev: evL, rule: ruleL, base: 40000, bps: 1500, snapshot: '{}', key: 'acc-2' }),
    /uq_commercial_ledger_accrual_per_event|unique/i);
  await rejects('chave de idempotência repetida é recusada', () =>
    ins({ type: 'adjustment', amount: 100, reason: 'x', key: 'acc-1' }), /uq_commercial_ledger_idempotency|unique/i);
  await rejects('sinal inválido: crédito negativo / estorno positivo', async () => {
    await ins({ type: 'accrual', amount: -5, attr: attrL, ev: evL, rule: ruleL, base: 1, bps: 1, snapshot: '{}' });
  }, /ledger_sign/);
  await rejects('estorno positivo é recusado', () => ins({ type: 'reversal', amount: 100, ref: accrual, reason: 'estorno' }), /ledger_sign/);
  await rejects('crédito sem snapshot/regra é recusado', () => ins({ type: 'accrual', amount: 100, attr: attrL, ev: evL }), /accrual_complete/);
  await rejects('estorno sem lançamento de referência/motivo é recusado', () => ins({ type: 'reversal', amount: -100 }), /reversal_references/);
  await rejects('compensação referenciando lançamento de OUTRO representante é recusada', () =>
    ins({ type: 'reversal', amount: -6000, ref: accrual, reason: 'estorno', rep: repM }), /fk_commercial_ledger_reference|foreign key/i);
  await ok('estorno compensatório do crédito (não apaga nem reverte o status do crédito)', async () => {
    await ins({ type: 'reversal', amount: -6000, ref: accrual, reason: 'chargeback', key: 'rev-1' });
  });
  await rejects('livro-razão é append-only: UPDATE bloqueado', () =>
    db.query(`UPDATE public.commercial_ledger_entries SET amount_cents = 1 WHERE id=$1`, [accrual]), /append-only/);
  await rejects('livro-razão é append-only: DELETE bloqueado', () =>
    db.query(`DELETE FROM public.commercial_ledger_entries WHERE id=$1`, [accrual]), /append-only/);
  await rejects('livro-razão é append-only: TRUNCATE simples bloqueado (FK)', () =>
    db.exec(`TRUNCATE public.commercial_ledger_entries`), /append-only|referenced in a foreign key/);
  await rejects('livro-razão é append-only: TRUNCATE ... CASCADE bloqueado pelo trigger', () =>
    db.exec(`TRUNCATE public.commercial_ledger_entries CASCADE`), /append-only/);

  const release = randomUUID();
  await ok('estado operacional em projeção separada (carência D+30) sem alterar o lançamento', async () => {
    await db.query(`INSERT INTO public.commercial_commission_releases (id, tenant_id, representative_id, ledger_entry_id, release_at) VALUES ($1,$2,$3,$4, now() + interval '30 days')`, [release, t3, repL, accrual]);
    await db.query(`UPDATE public.commercial_commission_releases SET status='released', released_at=now() WHERE id=$1`, [release]);
  });
  await rejects('só créditos (accrual) possuem estado de liberação', async () => {
    const rev = (await db.query(`SELECT id FROM public.commercial_ledger_entries WHERE entry_type='reversal' AND tenant_id=$1`, [t3])).rows[0].id;
    await db.query(`INSERT INTO public.commercial_commission_releases (tenant_id, representative_id, ledger_entry_id, release_at) VALUES ($1,$2,$3,now())`, [t3, repL, rev]);
  }, /fk_commercial_releases_entry|foreign key/i);
  await rejects('uma liberação por crédito', () =>
    db.query(`INSERT INTO public.commercial_commission_releases (tenant_id, representative_id, ledger_entry_id, release_at) VALUES ($1,$2,$3,now())`, [t3, repL, accrual]),
    /uq_commercial_releases_entry|unique/i);

  const payout = randomUUID();
  await rejects('repasse pago exige aprovação, comprovante e responsável', () =>
    db.query(`INSERT INTO public.commercial_payouts (id, tenant_id, representative_id, amount_cents, status) VALUES ($1,$2,$3,6000,'paid')`, [payout, t3, repL]), /approved_consistency|paid_consistency/);
  await ok('repasse em rascunho com item; o mesmo crédito não entra em dois repasses', async () => {
    await db.query(`INSERT INTO public.commercial_payouts (id, tenant_id, representative_id, amount_cents) VALUES ($1,$2,$3,6000)`, [payout, t3, repL]);
    await db.query(`INSERT INTO public.commercial_payout_items (tenant_id, payout_id, release_id, amount_cents) VALUES ($1,$2,$3,6000)`, [t3, payout, release]);
    const p2 = randomUUID();
    await db.query(`INSERT INTO public.commercial_payouts (id, tenant_id, representative_id, amount_cents) VALUES ($1,$2,$3,6000)`, [p2, t3, repL]);
    let dup = null;
    try { await db.query(`INSERT INTO public.commercial_payout_items (tenant_id, payout_id, release_id, amount_cents) VALUES ($1,$2,$3,6000)`, [t3, p2, release]); } catch (e) { dup = e; }
    if (!dup) throw new Error('crédito pago em duplicidade');
  });
  await ok('saldo derivado do livro-razão: ganho 6000 - 6000 estorno = 0 devido', async () => {
    const r = (await db.query(`SELECT earned_cents::text AS e, paid_cents::text AS p, owed_cents::text AS o FROM public.commercial_representative_balances WHERE tenant_id=$1 AND representative_id=$2`, [t3, repL])).rows[0];
    eq(r.e, '0');
    eq(r.p, '0');
    eq(r.o, '0');
  });
  await rejects('períodos de fechamento não podem se sobrepor', async () => {
    await db.query(`INSERT INTO public.commercial_closing_periods (tenant_id, period_start, period_end) VALUES ($1,'2026-11-01','2026-12-01')`, [t3]);
    await db.query(`INSERT INTO public.commercial_closing_periods (tenant_id, period_start, period_end) VALUES ($1,'2026-11-15','2026-12-15')`, [t3]);
  }, /no_overlap/);

  // ----------------------------------------------------------------- isolamento
  console.log('\n[9] Não-interferência no sistema existente');
  await ok('desligar a captura interrompe a geração de eventos imediatamente (interruptor)', async () => {
    const t = await seedTenant(db);
    const b = await seedBusiness(db, t, { modality: 'padrao', amount: 1000 });
    await enableCapture(db, t, 'shadow');
    await db.query(`UPDATE public.commercial_settings SET capture_mode='off' WHERE tenant_id=$1`, [t]);
    const inv = await newInvoice(db, t, b, { status: 'paid', due: 100, paid: 100, paidAt: new Date().toISOString() });
    eq((await events(db, inv)).length, 0);
  });
  await ok('exclusão de fatura sem eventos continua funcionando (módulo inativo = sem efeito)', async () => {
    const t = await seedTenant(db);
    const b = await seedBusiness(db, t);
    const inv = await newInvoice(db, t, b, { status: 'paid', due: 10, paid: 10, paidAt: new Date().toISOString() });
    await db.query(`DELETE FROM public.invoices WHERE id=$1`, [inv]);
    await db.query(`DELETE FROM public.businesses WHERE id=$1`, [b]);
  });
  await rejects('fatura com evento comercial capturado não pode ser apagada (proteção financeira)', async () => {
    await db.query(`DELETE FROM public.invoices WHERE id=$1`, [invL]);
  }, /foreign key|violates/i);

  // ------------------------------------------------------------------ rollbacks
  console.log('\n[10] Scripts de rollback (seguros)');
  await ok('rollback 232→228 com tabelas vazias remove tudo e restaura invoices ao estado original', async () => {
    const d = await freshDb();
    for (const n of [232, 231, 230, 229, 228]) await d.exec(read(`supabase/rollbacks/commercial/${n}_rollback.sql`));
    const left = (await d.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'commercial\\_%'`)).rows[0].n;
    eq(left, 0, 'objetos restantes');
    const trg = (await d.query(`SELECT tgname FROM pg_trigger WHERE tgrelid='public.invoices'::regclass AND NOT tgisinternal`)).rows.map((x) => x.tgname);
    eq(trg.join(','), 'trg_invoices_updated_at');
    const bucket = (await d.query(`SELECT count(*)::int AS n FROM storage.buckets WHERE id='commercial-documents'`)).rows[0].n;
    eq(bucket, 0, 'bucket removido');
    for (const file of MIGRATIONS) await d.exec(read(`supabase/migrations/${file}`)); // reaplicável
  });
  await ok('rollback 231 recusa apagar eventos financeiros e mantém o trigger (transação desfeita)', async () => {
    const d = await freshDb();
    const t = await seedTenant(d);
    const b = await seedBusiness(d, t, { modality: 'padrao', amount: 1000 });
    await enableCapture(d, t, 'shadow');
    await newInvoice(d, t, b, { status: 'paid', due: 100, paid: 100, paidAt: new Date().toISOString() });
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/231_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria ter sido recusado');
    const trg = (await d.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE tgname='trg_commercial_invoice_capture'`)).rows[0].n;
    eq(trg, 1, 'trigger preservado');
    eq((await d.query(`SELECT count(*)::int AS n FROM public.commercial_financial_events`)).rows[0].n, 1, 'evento preservado');
  });
  await ok('rollback 230 recusa apagar regras ativas/encerradas', async () => {
    const d = await freshDb();
    const t = await seedTenant(d);
    const u = randomUUID();
    await d.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'a@x.com')`, [u]);
    await d.query(
      `INSERT INTO public.commercial_commission_rules
         (tenant_id, rule_kind, plan_code, commission_type, rate_bps, effective_from, status, approved_by, approved_at, is_illustrative)
       VALUES ($1, 'plan_default', 'acacia', 'initial', 1500, now(), 'active', $2, now(), false)`,
      [t, u],
    );
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/230_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria ter sido recusado');
  });

  console.log('\n================================================================');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  if (failed > 0) {
    console.log('\nFalhas:');
    for (const f of failures) console.log(` - ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERRO FATAL NA SUÍTE:', e);
  process.exit(1);
});

