// Gate 1B · Módulo Comercial — isolamento e autorização em PostgreSQL real (PGlite/WASM).
//
// Simula o Supabase: papéis anon/authenticated/service_role e auth.uid() via request.jwt.claim.sub.
// LIMITES: não valida GoTrue/PostgREST/JWT reais nem a RLS de storage.objects do Supabase (stub fiel à
// política). O teste definitivo com pgTAP exige Docker + CLI e NÃO foi executado neste ambiente.
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
  '234_commercial_authorization.sql',
  '235_commercial_rls_policies.sql',
  '236_commercial_storage_policies.sql',
  '237_commercial_authorization_audit.sql',
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
function eq(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label} esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

const BASE_SCHEMA = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN DEFAULT false, file_size_limit BIGINT, allowed_mime_types TEXT[]);
  CREATE TABLE storage.objects (id UUID DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT ALL ON storage.objects TO authenticated, service_role;
  CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE
    AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  GRANT EXECUTE ON FUNCTION storage.foldername(TEXT) TO anon, authenticated, service_role;

  CREATE TABLE public.tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT);
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active', deleted_at TIMESTAMPTZ
  );
  CREATE TABLE public.roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT, is_global BOOLEAN DEFAULT false);
  CREATE TABLE public.user_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, role_id UUID, tenant_id UUID, status TEXT DEFAULT 'active', expires_at TIMESTAMPTZ);
  CREATE FUNCTION public.has_global_platform_role(p_role TEXT) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
  BEGIN
    IF p_role IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = p_role AND p.status = 'active' AND p.deleted_at IS NULL) THEN RETURN true; END IF;
    RETURN EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.status = 'active' AND (ur.expires_at IS NULL OR statement_timestamp() < ur.expires_at)
        AND (r.is_global = true OR ur.tenant_id IS NULL) AND r.code = p_role);
  END; $$;
  CREATE FUNCTION public.update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id), name TEXT,
    CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id)
  );
  CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, business_id UUID NOT NULL,
    invoice_number TEXT NOT NULL, amount_due NUMERIC(12,2) NOT NULL, amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'BRL', status TEXT NOT NULL DEFAULT 'draft', due_date DATE NOT NULL DEFAULT current_date,
    paid_at TIMESTAMPTZ, payment_method TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
  );
  CREATE TABLE public.business_commercial_terms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, business_id UUID NOT NULL UNIQUE, commercial_modality TEXT NOT NULL DEFAULT 'padrao', amount_cents INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE public.business_signup_invites (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.landing_leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
`;

async function freshDb(upTo = MIGRATIONS.length) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(BASE_SCHEMA);
  for (const file of MIGRATIONS.slice(0, upTo)) await db.exec(read(`supabase/migrations/${file}`));
  return db;
}

/** Executa SQL como um usuário autenticado (ou anon quando uid = 'anon'). */
async function asUser(db, uid, sql, params = []) {
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${uid && uid !== 'anon' ? uid : ''}', false)`);
  await db.exec(`SET ROLE ${uid === 'anon' ? 'anon' : 'authenticated'}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('RESET ROLE');
    await db.exec(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  }
}
const count = async (db, uid, table, where = 'true') =>
  Number((await asUser(db, uid, `SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`)).rows[0].n);
const denied = async (db, uid, sql, pattern = /permission denied|row-level security/i) => {
  let err = null;
  try { await asUser(db, uid, sql); } catch (e) { err = e; }
  if (!err) throw new Error(`esperava negação: ${sql}`);
  if (!pattern.test(err.message)) throw new Error(`erro inesperado: ${err.message}`);
};

let seq = 0;
async function mkUser(db, { role = 'member', status = 'active', email } = {}) {
  const id = randomUUID();
  seq += 1;
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, email ?? `u${seq}@t.com`]);
  await db.query(`INSERT INTO public.profiles (id, role, status) VALUES ($1, $2, $3)`, [id, role, status]);
  return id;
}
async function mkTenant(db, moduleEnabled = true) {
  const t = randomUUID();
  await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1, $2)`, [t, `t-${t.slice(0, 6)}`]);
  if (moduleEnabled !== null) {
    await db.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled) VALUES ($1, $2)`, [t, moduleEnabled]);
  }
  return t;
}
async function mkRep(db, tenant, userId, status = 'active') {
  const id = randomUUID();
  seq += 1;
  await db.query(
    `INSERT INTO public.commercial_representatives (id, tenant_id, user_id, person_type, legal_name, email, referral_code, status, contract_accepted_at, document_hash, terminated_at)
     VALUES ($1,$2,$3,'pf',$4,$5,$6,$7,$8,$9,$10)`,
    [id, tenant, userId, `Rep ${seq}`, `rep${seq}@t.com`, `REP-${String(200000 + seq)}`, status,
      ['invited', 'pending_review'].includes(status) ? null : new Date().toISOString(),
      ['invited', 'pending_review'].includes(status) ? null : `hash-${id}`,
      status === 'terminated' ? new Date().toISOString() : null],
  );
  return id;
}
async function grant(db, tenant, user, permission, extra = '') {
  await db.query(`INSERT INTO public.commercial_access_grants (tenant_id, user_id, permission) VALUES ($1,$2,$3)`, [tenant, user, permission]);
  if (extra) await db.exec(extra);
}
const approver = randomUUID();

/** Cadeia completa de dados de um representante (lead → comissão → repasse) + documento no storage. */
async function seedRepData(db, tenant, rep, label) {
  const lead = randomUUID();
  await db.query(`INSERT INTO public.commercial_leads (id, tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,$3,'representative',$4,$5)`, [lead, tenant, rep, `Lead ${label}`, `dk-${label}-${lead}`]);
  await db.query(`INSERT INTO public.commercial_lead_activities (tenant_id, lead_id, activity_type) VALUES ($1,$2,'contact')`, [tenant, lead]);
  await db.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type, lead_id) VALUES ($1,$2,'admin_registration',$3)`, [tenant, rep, lead]);
  const biz = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name) VALUES ($1,$2,$3)`, [biz, tenant, `Empresa ${label}`]);
  const attr = randomUUID();
  await db.query(`INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, attribution_type, status, confirmed_at) VALUES ($1,$2,$3,$4,'lead_registration','confirmed',now())`, [attr, tenant, biz, rep]);
  const inv = randomUUID();
  await db.query(`INSERT INTO public.invoices (id, tenant_id, business_id, invoice_number, amount_due, amount_paid, status) VALUES ($1,$2,$3,$4,400,400,'paid')`, [inv, tenant, biz, `INV-${label}`]);
  const ev = randomUUID();
  await db.query(`INSERT INTO public.commercial_financial_events (id, tenant_id, business_id, invoice_id, source_kind, event_type, seq, idempotency_key, delta_cents, cumulative_settled_cents) VALUES ($1,$2,$3,$4,'invoice_trigger','settlement',1,$5,40000,40000)`, [ev, tenant, biz, inv, `k-${label}-${ev}`]);
  const rule = randomUUID();
  await db.query(`INSERT INTO public.commercial_commission_rules (id, tenant_id, rule_kind, plan_code, commission_type, rate_bps, effective_from, status, approved_by, approved_at, is_illustrative, priority)
                  VALUES ($1,$2,'plan_default','acacia','initial',1500,'2026-01-01','active',$3,now(),false,$4)`, [rule, tenant, approver, seq++]);
  const ledger = randomUUID();
  await db.query(`INSERT INTO public.commercial_ledger_entries (id, tenant_id, representative_id, entry_type, amount_cents, attribution_id, financial_event_id, rule_id, rule_snapshot, base_amount_cents, rate_bps, idempotency_key)
                  VALUES ($1,$2,$3,'accrual',6000,$4,$5,$6,'{}',40000,1500,$7)`, [ledger, tenant, rep, attr, ev, rule, `l-${label}-${ledger}`]);
  const release = randomUUID();
  await db.query(`INSERT INTO public.commercial_commission_releases (id, tenant_id, representative_id, ledger_entry_id, release_at) VALUES ($1,$2,$3,$4,now())`, [release, tenant, rep, ledger]);
  const payout = randomUUID();
  await db.query(`INSERT INTO public.commercial_payouts (id, tenant_id, representative_id, amount_cents) VALUES ($1,$2,$3,6000)`, [payout, tenant, rep]);
  await db.query(`INSERT INTO public.commercial_payout_items (tenant_id, payout_id, release_id, amount_cents) VALUES ($1,$2,$3,6000)`, [tenant, payout, release]);
  await db.query(`INSERT INTO public.commercial_representative_documents (tenant_id, representative_id, doc_type, storage_path, mime_type, size_bytes) VALUES ($1,$2,'identity',$3,'application/pdf',1000)`, [tenant, rep, `${tenant}/${rep}/doc.pdf`]);
  await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('commercial-documents', $1)`, [`${tenant}/${rep}/doc.pdf`]);
  return { lead, attr, ledger, payout };
}

const OPERATIONAL = ['commercial_leads', 'commercial_lead_activities', 'commercial_referral_evidence', 'commercial_representative_documents'];
const FINANCIAL = ['commercial_attributions', 'commercial_ledger_entries', 'commercial_commission_releases', 'commercial_payouts', 'commercial_payout_items'];
const STAFF_ONLY = ['commercial_settings', 'commercial_access_grants', 'commercial_commission_rules', 'commercial_financial_events', 'commercial_capture_failures', 'commercial_closing_periods'];
const ALL_TABLES = [...OPERATIONAL, ...FINANCIAL, ...STAFF_ONLY, 'commercial_representatives'];

async function main() {
  console.log('================================================================');
  console.log('GATE 1B · MÓDULO COMERCIAL · AUTORIZAÇÃO E ISOLAMENTO (PGlite)');
  console.log('================================================================');

  const db = await freshDb();
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1,'aprovador@t.com')`, [approver]);

  // ------------------------------------------------------------- fixtures
  const T1 = await mkTenant(db, true);
  const T2 = await mkTenant(db, true);
  const T3 = await mkTenant(db, false); // módulo desligado
  const uA = await mkUser(db);
  const uB = await mkUser(db);
  const uInv = await mkUser(db);
  const uPend = await mkUser(db);
  const uSusp = await mkUser(db);
  const uTerm = await mkUser(db);
  const uInactiveProfile = await mkUser(db, { status: 'suspended' });
  const uAdvertiserDual = await mkUser(db, { role: 'anunciante' });
  const uAdmin = await mkUser(db, { role: 'platform_admin' });
  const uAdmin2 = await mkUser(db, { role: 'admin' });
  const uFinance = await mkUser(db, { role: 'finance' });
  const uMaster = await mkUser(db, { role: 'master' });
  const uComm = await mkUser(db);
  const uDocs = await mkUser(db);
  const uRevoked = await mkUser(db);
  const uExpired = await mkUser(db);
  const uStaffAll = await mkUser(db);
  const uStranger = await mkUser(db);

  const rA = await mkRep(db, T1, uA);
  const rB = await mkRep(db, T1, uB);
  const rInv = await mkRep(db, T1, uInv, 'invited');
  const rPend = await mkRep(db, T1, uPend, 'pending_review');
  const rSusp = await mkRep(db, T1, uSusp, 'suspended');
  const rTerm = await mkRep(db, T1, uTerm, 'terminated');
  const rInactive = await mkRep(db, T1, uInactiveProfile);
  const rDual = await mkRep(db, T1, uAdvertiserDual);
  const rT2 = await mkRep(db, T2, uA); // mesmo usuário A também é representante no tenant T2
  const rT3 = await mkRep(db, T3, uA); // tenant com módulo desligado

  const dA = await seedRepData(db, T1, rA, 'A');
  await seedRepData(db, T1, rB, 'B');
  await seedRepData(db, T1, rSusp, 'S');
  await seedRepData(db, T1, rTerm, 'X');
  await seedRepData(db, T1, rInv, 'I');
  await seedRepData(db, T1, rInactive, 'P');
  await seedRepData(db, T1, rDual, 'D');
  await seedRepData(db, T2, rT2, 'T2');
  await seedRepData(db, T3, rT3, 'T3');

  await grant(db, T1, uComm, 'commissions.read');
  await grant(db, T1, uDocs, 'documents.read');
  for (const p of ['representatives.read', 'leads.manage', 'attributions.manage', 'rules.manage', 'commissions.approve', 'payouts.manage', 'documents.read', 'settings.manage', 'audit.read']) {
    await grant(db, T1, uStaffAll, p);
  }
  await grant(db, T1, uAdmin, 'commissions.read'); // vale só para testar que role de admin é irrelevante sem grant
  await db.query(`DELETE FROM public.commercial_access_grants WHERE user_id=$1`, [uAdmin]); // admin SEM grant
  await grant(db, T1, uRevoked, 'commissions.read');
  await db.query(`UPDATE public.commercial_access_grants SET status='revoked', revoked_at=now() WHERE user_id=$1`, [uRevoked]);
  await grant(db, T1, uExpired, 'commissions.read');
  await db.query(`UPDATE public.commercial_access_grants SET expires_at = now() - interval '1 day' WHERE user_id=$1`, [uExpired]);
  await grant(db, T1, uAdvertiserDual, 'commissions.read'); // usuário anunciante + representante + staff
  await grant(db, T1, uFinance, 'commissions.read');

  // ---------------------------------------------------------------- 1
  console.log('\n[1] Anônimo e usuário sem vínculo');
  await ok('anon: nenhuma tabela legível (permission denied)', async () => {
    for (const t of ALL_TABLES) await denied(db, 'anon', `SELECT count(*) FROM public.${t}`);
  });
  await ok('usuário autenticado sem vínculo não vê nenhuma linha em nenhuma tabela', async () => {
    for (const t of [...OPERATIONAL, ...FINANCIAL, ...STAFF_ONLY]) eq(await count(db, uStranger, t), 0, t);
    eq(await count(db, uStranger, 'commercial_representatives', 'true'), 0, 'representatives');
  });
  await ok('anon e estranho: has_commercial_permission = false; anon sem EXECUTE', async () => {
    eq((await asUser(db, uStranger, `SELECT public.has_commercial_permission($1::uuid,'commissions.read') AS v`, [T1])).rows[0].v, false);
    await denied(db, 'anon', `SELECT public.has_commercial_permission('${T1}'::uuid,'commissions.read')`);
  });

  // ---------------------------------------------------------------- 2
  console.log('\n[2] Isolamento entre representantes (mesmo tenant)');
  await ok('representante ATIVO A vê só os próprios dados operacionais e financeiros', async () => {
    for (const t of [...OPERATIONAL, ...FINANCIAL]) {
      const total = await count(db, uA, t, `tenant_id = '${T1}'`);
      if (total !== 1) throw new Error(`${t}: A deveria ver 1 linha do T1, viu ${total}`);
    }
    eq(await count(db, uA, 'commercial_leads', `representative_id = '${rB}'`), 0, 'leads de B');
    eq(await count(db, uA, 'commercial_ledger_entries', `representative_id = '${rB}'`), 0, 'ledger de B');
    eq(await count(db, uA, 'commercial_representatives', `id = '${rB}'`), 0, 'cadastro de B');
    eq(await count(db, uA, 'commercial_representatives', `id = '${rA}'`), 1, 'próprio cadastro');
  });
  await ok('representante A não vê tabelas exclusivas de staff', async () => {
    for (const t of STAFF_ONLY) {
      const n = await count(db, uA, t, `tenant_id = '${T1}'`);
      // access_grants: A não possui grants no T1 → 0 também
      eq(n, 0, t);
    }
  });
  await ok('saldo derivado (view security_invoker) mostra só o do próprio representante', async () => {
    const rows = (await asUser(db, uA, `SELECT representative_id, earned_cents::text AS e FROM public.commercial_representative_balances WHERE tenant_id=$1`, [T1])).rows;
    eq(rows.length, 1);
    eq(rows[0].representative_id, rA);
    eq(rows[0].e, '6000');
  });

  // ---------------------------------------------------------------- 3
  console.log('\n[3] Status do representante');
  await ok('convidado / em análise: só o próprio cadastro, nada operacional ou financeiro', async () => {
    for (const u of [uInv, uPend]) {
      eq(await count(db, u, 'commercial_representatives'), 1, 'cadastro');
      for (const t of [...OPERATIONAL, ...FINANCIAL]) eq(await count(db, u, t), 0, t);
    }
  });
  await ok('suspenso e desligado: SOMENTE leitura do histórico financeiro (créditos preservados), sem dados operacionais', async () => {
    for (const u of [uSusp, uTerm]) {
      for (const t of FINANCIAL) eq(await count(db, u, t), 1, t);
      for (const t of OPERATIONAL) eq(await count(db, u, t), 0, t);
      eq(await count(db, u, 'commercial_representatives'), 1, 'cadastro');
    }
  });
  await ok('perfil inativo (profiles.status != active) perde todo acesso mesmo sendo representante ativo', async () => {
    for (const t of [...OPERATIONAL, ...FINANCIAL, 'commercial_representatives']) eq(await count(db, uInactiveProfile, t), 0, t);
  });

  // ---------------------------------------------------------------- 4
  console.log('\n[4] Permissões de staff (sem admin automático)');
  await ok('staff com só commissions.read: lê ledger/repasses/liberações/eventos/períodos; NÃO lê leads, documentos, regras, grants, configuração', async () => {
    for (const t of ['commercial_ledger_entries', 'commercial_commission_releases', 'commercial_payouts', 'commercial_payout_items', 'commercial_financial_events']) {
      if ((await count(db, uComm, t, `tenant_id = '${T1}'`)) < 1) throw new Error(`${t}: deveria ler`);
    }
    for (const t of ['commercial_leads', 'commercial_lead_activities', 'commercial_referral_evidence', 'commercial_representative_documents', 'commercial_attributions', 'commercial_commission_rules', 'commercial_settings', 'commercial_capture_failures']) {
      eq(await count(db, uComm, t, `tenant_id = '${T1}'`), 0, t);
    }
    eq(await count(db, uComm, 'commercial_representatives'), 0, 'cadastros');
    // grants: enxerga apenas o PRÓPRIO (para a interface saber o que exibir), nunca os de outros usuários
    eq(await count(db, uComm, 'commercial_access_grants'), 1, 'grants visíveis');
    eq(await count(db, uComm, 'commercial_access_grants', `user_id = '${uComm}'`), 1, 'grant próprio');
  });
  await ok('staff com documents.read lê documentos mas não comissões', async () => {
    if ((await count(db, uDocs, 'commercial_representative_documents', `tenant_id='${T1}'`)) < 7) throw new Error('deveria ler documentos');
    eq(await count(db, uDocs, 'commercial_ledger_entries'), 0, 'ledger');
  });
  await ok('staff com todas as permissões lê tudo do SEU tenant e nada de outro tenant', async () => {
    for (const t of ['commercial_leads', 'commercial_ledger_entries', 'commercial_payouts', 'commercial_attributions', 'commercial_commission_rules', 'commercial_representatives', 'commercial_representative_documents']) {
      if ((await count(db, uStaffAll, t, `tenant_id = '${T1}'`)) < 1) throw new Error(`${t}: deveria ler T1`);
      eq(await count(db, uStaffAll, t, `tenant_id <> '${T1}'`), 0, `${t} (outros tenants)`);
    }
  });
  await ok('administrador da plataforma SEM grant (platform_admin/admin/finance) não vê nada', async () => {
    for (const u of [uAdmin, uAdmin2]) {
      for (const t of [...OPERATIONAL, ...FINANCIAL, ...STAFF_ONLY, 'commercial_representatives']) eq(await count(db, u, t), 0, t);
    }
  });
  await ok('papel finance com grant explícito acessa apenas o que o grant cobre', async () => {
    if ((await count(db, uFinance, 'commercial_ledger_entries', `tenant_id='${T1}'`)) < 1) throw new Error('deveria ler ledger');
    eq(await count(db, uFinance, 'commercial_leads'), 0, 'leads');
  });
  await ok('grant revogado ou expirado não concede acesso', async () => {
    eq(await count(db, uRevoked, 'commercial_ledger_entries'), 0, 'revogado');
    eq(await count(db, uExpired, 'commercial_ledger_entries'), 0, 'expirado');
  });
  await ok('master (recuperação) acessa o módulo, inclusive com o módulo desligado', async () => {
    if ((await count(db, uMaster, 'commercial_ledger_entries', `tenant_id='${T3}'`)) < 1) throw new Error('master deveria ler T3 (módulo desligado)');
    if ((await count(db, uMaster, 'commercial_leads', `tenant_id='${T1}'`)) < 1) throw new Error('master deveria ler T1');
  });
  await ok('mesmo usuário anunciante + representante + staff: acessa as duas frentes', async () => {
    eq(await count(db, uAdvertiserDual, 'commercial_leads', `representative_id='${rDual}'`), 1, 'como representante');
    if ((await count(db, uAdvertiserDual, 'commercial_ledger_entries', `tenant_id='${T1}'`)) < 7) throw new Error('como staff deveria ver o tenant');
  });

  // ---------------------------------------------------------------- 5
  console.log('\n[5] Multi-tenant e módulo desligado');
  await ok('mesmo usuário (A) é representante em T1 e T2: cada tenant mostra só o próprio vínculo', async () => {
    eq(await count(db, uA, 'commercial_leads', `tenant_id='${T2}'`), 1, 'T2 (módulo ligado)');
    eq(await count(db, uA, 'commercial_leads', `tenant_id='${T1}'`), 1, 'T1');
  });
  await ok('módulo DESLIGADO no tenant: representante ativo não vê nada, nem o próprio cadastro', async () => {
    for (const t of [...OPERATIONAL, ...FINANCIAL, 'commercial_representatives']) eq(await count(db, uA, t, `tenant_id='${T3}'`), 0, t);
  });
  await ok('permissão de um tenant não vale em outro', async () => {
    eq(await count(db, uStaffAll, 'commercial_ledger_entries', `tenant_id='${T2}'`), 0);
    eq((await asUser(db, uStaffAll, `SELECT public.has_commercial_permission($1::uuid,'commissions.read') AS v`, [T2])).rows[0].v, false);
  });

  // ---------------------------------------------------------------- 6
  console.log('\n[6] Escrita direta e colunas sensíveis');
  await ok('authenticated não escreve em NENHUMA tabela comercial (INSERT/UPDATE/DELETE negados)', async () => {
    for (const t of ALL_TABLES) {
      await denied(db, uStaffAll, `INSERT INTO public.${t} DEFAULT VALUES`);
      await denied(db, uStaffAll, `DELETE FROM public.${t}`);
    }
    await denied(db, uA, `UPDATE public.commercial_representatives SET status='active' WHERE id='${rA}'`);
    await denied(db, uA, `UPDATE public.commercial_ledger_entries SET amount_cents = 1`);
    await denied(db, uMaster, `INSERT INTO public.commercial_ledger_entries DEFAULT VALUES`);
  });
  await ok('representante lê colunas seguras; hash/cifrados/fiscal/PIX cifrado são negados', async () => {
    const r = await asUser(db, uA, `SELECT legal_name, referral_code, status, document_last4 FROM public.commercial_representatives WHERE id=$1`, [rA]);
    eq(r.rows.length, 1);
    for (const col of ['document_hash', 'document_encrypted', 'pix_key_encrypted', 'tax_profile', 'created_by']) {
      await denied(db, uA, `SELECT ${col} FROM public.commercial_representatives WHERE id='${rA}'`);
    }
    await denied(db, uStaffAll, `SELECT * FROM public.commercial_representatives`); // * inclui colunas negadas
  });

  // ---------------------------------------------------------------- 7
  console.log('\n[7] Storage privado (commercial-documents)');
  const objects = async (uid) => (await asUser(db, uid, `SELECT name FROM storage.objects WHERE bucket_id='commercial-documents'`)).rows.map((x) => x.name);
  await ok('representante ativo lê só os próprios documentos; staff com documents.read lê os do tenant', async () => {
    const a = await objects(uA);
    // A tem objetos em T1 (rA) e T2 (rT2, módulo ligado); T3 (módulo desligado) fica oculto
    eq(a.includes(`${T1}/${rA}/doc.pdf`), true, 'próprio T1');
    eq(a.includes(`${T1}/${rB}/doc.pdf`), false, 'de B');
    eq(a.includes(`${T3}/${rT3}/doc.pdf`), false, 'módulo desligado');
    const d = await objects(uDocs);
    eq(d.includes(`${T1}/${rA}/doc.pdf`) && d.includes(`${T1}/${rB}/doc.pdf`), true, 'staff T1');
    eq(d.some((n) => n.startsWith(T2)), false, 'staff não lê T2');
  });
  await ok('suspenso/convidado/estranho/anon não leem documentos; caminho malformado não vaza', async () => {
    for (const u of [uSusp, uInv, uStranger, uComm]) eq((await objects(u)).length, 0, 'sem acesso');
    await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('commercial-documents', 'lixo/sem-uuid.pdf'), ('commercial-documents', 'solto.pdf')`);
    eq((await objects(uStaffAll)).some((n) => n === 'lixo/sem-uuid.pdf' || n === 'solto.pdf'), false);
    await denied(db, 'anon', `SELECT name FROM storage.objects`);
  });
  await ok('authenticated não grava nem remove objetos do bucket (somente servidor com URL assinada)', async () => {
    await denied(db, uA, `INSERT INTO storage.objects (bucket_id, name) VALUES ('commercial-documents', '${T1}/${rA}/novo.pdf')`);
    // sem policy de DELETE/UPDATE o RLS não dá erro: filtra as linhas (0 afetadas) e os objetos permanecem
    const before = (await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='commercial-documents'`)).rows[0].n;
    const del = await asUser(db, uStaffAll, `DELETE FROM storage.objects WHERE bucket_id='commercial-documents'`);
    const upd = await asUser(db, uStaffAll, `UPDATE storage.objects SET name = name WHERE bucket_id='commercial-documents'`);
    eq(del.affectedRows, 0, 'DELETE');
    eq(upd.affectedRows, 0, 'UPDATE');
    eq((await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='commercial-documents'`)).rows[0].n, before, 'objetos preservados');
  });

  // ---------------------------------------------------------------- 8
  console.log('\n[8] Auditoria 237 e regressão do módulo');
  await ok('auditoria 237 reprova escrita indevida e coluna sensível exposta (e volta a passar)', async () => {
    await db.exec(`GRANT INSERT ON public.commercial_leads TO authenticated`);
    let e1 = null; try { await db.exec(read('supabase/migrations/237_commercial_authorization_audit.sql')); } catch (e) { e1 = e; }
    if (!e1 || !/escrita/.test(e1.message)) throw new Error('deveria reprovar escrita');
    await db.exec(`REVOKE INSERT ON public.commercial_leads FROM authenticated`);
    await db.exec(`GRANT SELECT (document_hash) ON public.commercial_representatives TO authenticated`);
    let e2 = null; try { await db.exec(read('supabase/migrations/237_commercial_authorization_audit.sql')); } catch (e) { e2 = e; }
    if (!e2 || !/sens/i.test(e2.message)) throw new Error('deveria reprovar coluna sensível');
    await db.exec(`REVOKE SELECT (document_hash) ON public.commercial_representatives FROM authenticated`);
    await db.exec(read('supabase/migrations/237_commercial_authorization_audit.sql'));
  });
  await ok('module_enabled pode ser ligado com captura desligada (testar a área sem capturar pagamentos)', async () => {
    const t = await mkTenant(db, null);
    await db.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled, capture_mode) VALUES ($1, true, 'off')`, [t]);
    const inv = await db.query(`SELECT count(*)::int AS n FROM public.commercial_financial_events WHERE tenant_id=$1`, [t]);
    eq(inv.rows[0].n, 0);
  });
  await ok('re-execução 234–237 é idempotente', async () => {
    for (const file of MIGRATIONS.slice(6)) await db.exec(read(`supabase/migrations/${file}`));
  });
  void dA;

  // ---------------------------------------------------------------- 9
  console.log('\n[9] Rollbacks 236 → 234');
  await ok('rollback 236/235/234 em banco limpo remove políticas, concessões e funções; Gate 1A permanece íntegro', async () => {
    const d = await freshDb();
    for (const n of [236, 235, 234]) await d.exec(read(`supabase/rollbacks/commercial/${n}_rollback.sql`));
    const pol = (await d.query(`SELECT count(*)::int AS n FROM pg_policies WHERE policyname LIKE 'commercial\\_%\\_select' OR policyname = 'commercial_documents_select'`)).rows[0].n;
    eq(pol, 0, 'políticas SELECT');
    const fn = (await d.query(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('has_commercial_permission','commercial_rep_access','commercial_module_enabled')`)).rows[0].n;
    eq(fn, 0, 'funções');
    const authGrant = (await d.query(`SELECT has_table_privilege('authenticated','public.commercial_ledger_entries','SELECT') AS v`)).rows[0].v;
    eq(authGrant, false, 'authenticated sem acesso');
    await d.exec(read('supabase/migrations/233_commercial_security_audit.sql')); // auditoria do 1A volta a passar
    for (const file of MIGRATIONS.slice(6)) await d.exec(read(`supabase/migrations/${file}`)); // reaplicável
  });
  await ok('rollback 234 recusa se algum tenant tem módulo ligado com captura desligada', async () => {
    const d = await freshDb();
    const t = randomUUID();
    await d.query(`INSERT INTO public.tenants (id, slug) VALUES ($1,'x')`, [t]);
    await d.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled) VALUES ($1, true)`, [t]);
    for (const n of [236, 235]) await d.exec(read(`supabase/rollbacks/commercial/${n}_rollback.sql`));
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/234_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback 234 deveria recusar');
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
