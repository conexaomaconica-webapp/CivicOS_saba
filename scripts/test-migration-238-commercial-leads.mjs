// Gate 1C · Módulo Comercial — operações atômicas de leads e atribuições (migration 238) em PostgreSQL real (PGlite).
// LIMITES: igual aos demais (PGlite não é o Supabase; pgTAP/Docker não executado neste ambiente).
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = [
  '228_commercial_foundation.sql', '229_commercial_leads_attributions.sql', '230_commercial_commission_rules.sql',
  '231_commercial_financial_events.sql', '232_commercial_ledger_payouts.sql', '233_commercial_security_audit.sql',
  '234_commercial_authorization.sql', '235_commercial_rls_policies.sql', '236_commercial_storage_policies.sql',
  '237_commercial_authorization_audit.sql', '238_commercial_leads_operations.sql',
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
const tenant = async (db, days = null) => {
  const t = randomUUID();
  await db.query(`INSERT INTO public.tenants (id, slug) VALUES ($1,$2)`, [t, `t${t.slice(0, 5)}`]);
  await db.query(`INSERT INTO public.commercial_settings (tenant_id, module_enabled, lead_reservation_days) VALUES ($1, true, $2)`, [t, days ?? 60]);
  return t;
};
const rep = async (db, t, status = 'active') => {
  seq += 1;
  const id = randomUUID();
  await db.query(
    `INSERT INTO public.commercial_representatives (id, tenant_id, person_type, legal_name, email, referral_code, status, contract_accepted_at, document_hash, terminated_at)
     VALUES ($1,$2,'pf',$3,$4,$5,$6,$7,$8,$9)`,
    [id, t, `Rep ${seq}`, `r${seq}@t.com`, `REP-${String(300000 + seq)}`, status,
      status === 'active' || status === 'suspended' || status === 'terminated' ? new Date().toISOString() : null,
      status === 'active' || status === 'suspended' || status === 'terminated' ? `h-${id}` : null,
      status === 'terminated' ? new Date().toISOString() : null]);
  return id;
};
const biz = async (db, t) => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.businesses (id, tenant_id, name) VALUES ($1,$2,'Empresa')`, [id, t]);
  return id;
};
const lead = async (db, t, r, status = 'new') => {
  const id = randomUUID();
  await db.query(`INSERT INTO public.commercial_leads (id, tenant_id, representative_id, source, company_name, dedupe_key, status, qualified_at) VALUES ($1,$2,$3,'representative','Lead',$4,$5,$6)`,
    [id, t, r, `dk-${id}`, status, ['qualified', 'proposal', 'won'].includes(status) ? new Date().toISOString() : null]);
  return id;
};
const actor = async (db) => {
  const id = randomUUID();
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1,$2)`, [id, `a${id.slice(0, 5)}@t.com`]);
  return id;
};
const call = (db, fn, ...args) => db.query(`SELECT public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) AS r`, args);
const row = async (db, sql, params = []) => (await db.query(sql, params)).rows[0];

async function main() {
  console.log('================================================================');
  console.log('GATE 1C · MÓDULO COMERCIAL · LEADS E ATRIBUIÇÕES (migration 238, PGlite)');
  console.log('================================================================');
  const db = await freshDb();
  const a = await actor(db);

  console.log('\n[1] Aplicação e permissões');
  await ok('re-execução da 238 é idempotente', async () => { await db.exec(read('supabase/migrations/238_commercial_leads_operations.sql')); });
  await ok('funções executáveis somente por service_role (nunca anon/authenticated)', async () => {
    for (const fn of ['commercial_register_lead(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text)', 'commercial_log_lead_activity(uuid,uuid,text,uuid,text)', 'commercial_qualify_lead(uuid,uuid,uuid)', 'commercial_convert_lead(uuid,uuid,uuid,uuid)', 'commercial_confirm_attribution(uuid,uuid,uuid)', 'commercial_expire_stale(uuid)']) {
      const r = await row(db, `SELECT has_function_privilege('anon', '${fn}', 'EXECUTE') AS an, has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS au, has_function_privilege('service_role', '${fn}', 'EXECUTE') AS sr`);
      if (r.an || r.au) throw new Error(`${fn} acessível a anon/authenticated`);
      eq(r.sr, true, `${fn} service_role`);
    }
  });
  await ok('novos tipos de evidência aceitos; tipo desconhecido recusado', async () => {
    const t = await tenant(db); const r = await rep(db, t);
    await db.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type) VALUES ($1,$2,'representative_registration')`, [t, r]);
    let err = null;
    try { await db.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type) VALUES ($1,$2,'qualquer')`, [t, r]); } catch (e) { err = e; }
    if (!err) throw new Error('tipo desconhecido aceito');
  });

  console.log('\n[1B] Cadastro de lead pelo representante (atômico)');
  const tR = await tenant(db);
  const repR = await rep(db, tR);
  const registered = [];
  await ok('lead é criado com evidência de origem e atividade inicial, na mesma transação', async () => {
    const id = (await call(db, 'commercial_register_lead', tR, repR, a, 'Padaria Estrela', `dk-${randomUUID()}`, 'João', 'joao@padaria.com', '11999990000', 'São Paulo', 'SP', 'acacia', 'indicado')).rows[0].r;
    registered.push(id);
    const l = await row(db, `SELECT status, source, representative_id, interested_plan_code FROM public.commercial_leads WHERE id=$1`, [id]);
    eq(l.status, 'new'); eq(l.source, 'representative'); eq(l.representative_id, repR); eq(l.interested_plan_code, 'acacia');
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_referral_evidence WHERE lead_id=$1 AND evidence_type='representative_registration'`, [id])).n, 1, 'evidência');
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_lead_activities WHERE lead_id=$1`, [id])).n, 1, 'atividade inicial');
  });
  await ok('mesmo prospect (chave de duplicidade) em atendimento é recusado para outro representante e NADA é gravado', async () => {
    const repX = await rep(db, tR);
    const dk = `dup-${randomUUID()}`;
    await call(db, 'commercial_register_lead', tR, repR, a, 'Empresa 1', dk);
    const before = (await row(db, `SELECT count(*)::int AS n FROM public.commercial_leads WHERE tenant_id=$1`, [tR])).n;
    const evBefore = (await row(db, `SELECT count(*)::int AS n FROM public.commercial_referral_evidence WHERE tenant_id=$1`, [tR])).n;
    let err = null;
    try { await call(db, 'commercial_register_lead', tR, repX, a, 'Empresa 1 (outra)', dk); } catch (e) { err = e; }
    if (!err || !/uq_commercial_leads_active_dedupe|unique/i.test(err.message)) throw new Error('deveria recusar duplicidade');
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_leads WHERE tenant_id=$1`, [tR])).n, before, 'leads');
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_referral_evidence WHERE tenant_id=$1`, [tR])).n, evBefore, 'evidências');
  });
  await rejects('representante convidado/suspenso não registra leads', async () => {
    const rI = await rep(db, tR, 'invited');
    await call(db, 'commercial_register_lead', tR, rI, a, 'X', `dk-${randomUUID()}`);
  }, /representative_not_active/);
  await rejects('plano de interesse fora do catálogo é recusado', () =>
    call(db, 'commercial_register_lead', tR, repR, a, 'Y', `dk-${randomUUID()}`, null, null, null, null, null, 'platina'), /interested_plan_code/);

  console.log('\n[2] Atividade e qualificação (reserva de 60 dias)');
  const t1 = await tenant(db);
  const r1 = await rep(db, t1);
  await rejects('qualificar sem atividade real de contato é recusado', async () => {
    const l = await lead(db, t1, r1);
    await call(db, 'commercial_qualify_lead', t1, l, a);
  }, /lead_requires_activity/);
  await ok('atividade de contato move new → contacted e atualiza last_activity_at', async () => {
    const l = await lead(db, t1, r1);
    await db.query(`UPDATE public.commercial_leads SET last_activity_at = now() - interval '10 days' WHERE id=$1`, [l]);
    await call(db, 'commercial_log_lead_activity', t1, l, 'contact', a, 'ligação');
    const x = await row(db, `SELECT status, (last_activity_at > now() - interval '1 minute') AS fresh FROM public.commercial_leads WHERE id=$1`, [l]);
    eq(x.status, 'contacted');
    eq(x.fresh, true);
  });
  const lq = await lead(db, t1, r1);
  await ok('qualificar com atividade reserva o lead por 60 dias e registra a qualificação', async () => {
    await call(db, 'commercial_log_lead_activity', t1, lq, 'meeting', a, 'reunião');
    await call(db, 'commercial_qualify_lead', t1, lq, a);
    const x = await row(db, `SELECT status, qualified_at IS NOT NULL AS q, extract(day FROM (reserved_until - now()))::int AS d FROM public.commercial_leads WHERE id=$1`, [lq]);
    eq(x.status, 'qualified');
    eq(x.q, true);
    if (x.d < 59 || x.d > 60) throw new Error(`reserva deveria ser ~60 dias, foi ${x.d}`);
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_lead_activities WHERE lead_id=$1 AND activity_type='qualification'`, [lq])).n, 1);
  });
  await rejects('qualificar duas vezes é recusado', () => call(db, 'commercial_qualify_lead', t1, lq, a), /lead_not_qualifiable/);
  await ok('nova atividade renova a reserva do lead qualificado', async () => {
    await db.query(`UPDATE public.commercial_leads SET reserved_until = now() + interval '5 days' WHERE id=$1`, [lq]);
    await call(db, 'commercial_log_lead_activity', t1, lq, 'follow_up', a, null);
    const x = await row(db, `SELECT extract(day FROM (reserved_until - now()))::int AS d FROM public.commercial_leads WHERE id=$1`, [lq]);
    if (x.d < 59) throw new Error(`reserva não foi renovada (${x.d} dias)`);
  });
  await ok('prazo de reserva é configurável por tenant (nada fixo no código)', async () => {
    const t = await tenant(db, 15); const r = await rep(db, t); const l = await lead(db, t, r);
    await call(db, 'commercial_log_lead_activity', t, l, 'contact', a, null);
    await call(db, 'commercial_qualify_lead', t, l, a);
    const x = await row(db, `SELECT extract(day FROM (reserved_until - now()))::int AS d FROM public.commercial_leads WHERE id=$1`, [l]);
    if (x.d < 14 || x.d > 15) throw new Error(`esperado ~15 dias, foi ${x.d}`);
  });
  await rejects('atividade em lead encerrado é recusada', async () => {
    const l = await lead(db, t1, r1, 'lost');
    await call(db, 'commercial_log_lead_activity', t1, l, 'note', a, null);
  }, /lead_closed/);
  await rejects('lead de outro tenant não é encontrado (isolamento por tenant)', async () => {
    const other = await tenant(db);
    await call(db, 'commercial_log_lead_activity', other, lq, 'note', a, null);
  }, /lead_not_found/);

  console.log('\n[3] Conversão lead → anunciante (origem preservada, sem conflito)');
  const t2 = await tenant(db);
  const rA = await rep(db, t2);
  const rB = await rep(db, t2);
  const evA = randomUUID();
  const leadA = await lead(db, t2, rA, 'qualified');
  await db.query(`INSERT INTO public.commercial_referral_evidence (id, tenant_id, representative_id, evidence_type, lead_id, reference_code, evidence) VALUES ($1,$2,$3,'referral_link_visit',$4,'REP-300001','{"origem":"link"}')`, [evA, t2, rA, leadA]);
  const bizA = await biz(db, t2);
  await ok('converter cria atribuição CONFIRMADA, reaproveita a evidência original e vincula a empresa', async () => {
    const attr = (await call(db, 'commercial_convert_lead', t2, leadA, bizA, a)).rows[0].r;
    const at = await row(db, `SELECT status, representative_id, origin_evidence_id, attribution_type FROM public.commercial_attributions WHERE id=$1`, [attr]);
    eq(at.status, 'confirmed');
    eq(at.representative_id, rA);
    eq(at.origin_evidence_id, evA, 'origem preservada');
    eq(at.attribution_type, 'lead_registration');
    eq((await row(db, `SELECT business_id FROM public.commercial_referral_evidence WHERE id=$1`, [evA])).business_id, bizA, 'evidência vinculada à empresa');
    const l = await row(db, `SELECT status, converted_business_id FROM public.commercial_leads WHERE id=$1`, [leadA]);
    eq(l.status, 'won');
    eq(l.converted_business_id, bizA);
  });
  await rejects('lead já convertido não converte de novo', () => call(db, 'commercial_convert_lead', t2, leadA, bizA, a), /lead_not_convertible/);
  await ok('conflito: empresa que já tem atribuição confirmada de outro representante é recusada e NADA muda (atomicidade)', async () => {
    const lB = await lead(db, t2, rB, 'qualified');
    let err = null;
    try { await call(db, 'commercial_convert_lead', t2, lB, bizA, a); } catch (e) { err = e; }
    if (!err || !/attribution_conflict/.test(err.message)) throw new Error('deveria recusar por conflito');
    eq((await row(db, `SELECT status FROM public.commercial_leads WHERE id=$1`, [lB])).status, 'qualified', 'lead intacto');
    eq((await row(db, `SELECT count(*)::int AS n FROM public.commercial_attributions WHERE business_id=$1 AND status='confirmed'`, [bizA])).n, 1, 'uma atribuição confirmada');
  });
  await ok('lead sem evidência prévia recebe evidência lead_conversion', async () => {
    const l = await lead(db, t2, rB, 'qualified'); const b = await biz(db, t2);
    await call(db, 'commercial_convert_lead', t2, l, b, a);
    eq((await row(db, `SELECT e.evidence_type FROM public.commercial_attributions a JOIN public.commercial_referral_evidence e ON e.id = a.origin_evidence_id WHERE a.business_id=$1`, [b])).evidence_type, 'lead_conversion');
  });
  await rejects('representante suspenso/desligado não converte leads (nenhuma comissão nova)', async () => {
    const rS = await rep(db, t2, 'suspended'); const l = await lead(db, t2, rS, 'qualified'); const b = await biz(db, t2);
    await call(db, 'commercial_convert_lead', t2, l, b, a);
  }, /representative_not_active/);
  await rejects('empresa de outro tenant não é aceita', async () => {
    const other = await tenant(db); const b = await biz(db, other); const l = await lead(db, t2, rA, 'qualified');
    await call(db, 'commercial_convert_lead', t2, l, b, a);
  }, /business_not_found/);
  await rejects('lead sem representante não converte', async () => {
    const l = randomUUID(); const b = await biz(db, t2);
    await db.query(`INSERT INTO public.commercial_leads (id, tenant_id, source, company_name, dedupe_key) VALUES ($1,$2,'landing_page','X',$3)`, [l, t2, `dk-${l}`]);
    await call(db, 'commercial_convert_lead', t2, l, b, a);
  }, /lead_without_representative/);

  console.log('\n[4] Confirmação de atribuição pendente');
  const t3 = await tenant(db);
  const r3a = await rep(db, t3); const r3b = await rep(db, t3);
  const b3 = await biz(db, t3);
  const mkAttr = async (r, b, status = 'pending', validUntil = null) => {
    const id = randomUUID();
    await db.query(`INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, attribution_type, status, valid_until, confirmed_at, created_by)
                    VALUES ($1,$2,$3,$4,'admin_assigned',$5,$6,$7,$8)`, [id, t3, b, r, status, validUntil, status === 'confirmed' ? new Date().toISOString() : null, a]);
    return id;
  };
  const p1 = await mkAttr(r3a, b3);
  const p2 = await mkAttr(r3b, b3);
  await ok('confirmar pendente → confirmada com autor e data', async () => {
    await call(db, 'commercial_confirm_attribution', t3, p1, a);
    const x = await row(db, `SELECT status, confirmed_by, confirmed_at IS NOT NULL AS c FROM public.commercial_attributions WHERE id=$1`, [p1]);
    eq(x.status, 'confirmed'); eq(x.confirmed_by, a); eq(x.c, true);
  });
  await rejects('conflito: confirmar a pendente de outro representante para a mesma empresa é recusado', () => call(db, 'commercial_confirm_attribution', t3, p2, a), /attribution_conflict/);
  await rejects('confirmar atribuição já confirmada/não pendente é recusado', () => call(db, 'commercial_confirm_attribution', t3, p1, a), /attribution_not_pending/);
  await rejects('atribuição pendente vencida não pode ser confirmada', async () => {
    const b = await biz(db, t3); const p = await mkAttr(r3a, b, 'pending', new Date(Date.now() - 86400000).toISOString());
    await call(db, 'commercial_confirm_attribution', t3, p, a);
  }, /attribution_expired/);
  await rejects('representante suspenso não tem atribuição confirmada', async () => {
    const rs = await rep(db, t3, 'suspended'); const b = await biz(db, t3); const p = await mkAttr(rs, b);
    await call(db, 'commercial_confirm_attribution', t3, p, a);
  }, /representative_not_active/);

  console.log('\n[5] Expiração por inatividade');
  const t4 = await tenant(db, 30);
  const r4 = await rep(db, t4);
  await ok('expira leads sem atividade na janela e atribuições pendentes vencidas; mantém os ativos', async () => {
    const stale = await lead(db, t4, r4, 'contacted');
    await db.query(`UPDATE public.commercial_leads SET last_activity_at = now() - interval '40 days' WHERE id=$1`, [stale]);
    const fresh = await lead(db, t4, r4, 'contacted');
    const q = await lead(db, t4, r4, 'qualified');
    await db.query(`UPDATE public.commercial_leads SET reserved_until = now() + interval '10 days', last_activity_at = now() - interval '40 days' WHERE id=$1`, [q]);
    const qExp = await lead(db, t4, r4, 'qualified');
    await db.query(`UPDATE public.commercial_leads SET reserved_until = now() - interval '1 day' WHERE id=$1`, [qExp]);
    const b = await biz(db, t4);
    const attrOld = randomUUID();
    await db.query(`INSERT INTO public.commercial_attributions (id, tenant_id, business_id, representative_id, attribution_type, status, valid_until, created_by) VALUES ($1,$2,$3,$4,'admin_assigned','pending', now() - interval '1 day', $5)`, [attrOld, t4, b, r4, a]);
    const res = (await call(db, 'commercial_expire_stale', t4)).rows[0].r;
    eq(res.leads_expired, 2, 'leads expirados');
    eq(res.attributions_expired, 1, 'atribuições expiradas');
    for (const [id, st] of [[stale, 'expired'], [fresh, 'contacted'], [q, 'qualified'], [qExp, 'expired']]) {
      eq((await row(db, `SELECT status FROM public.commercial_leads WHERE id=$1`, [id])).status, st, `lead ${st}`);
    }
    eq((await row(db, `SELECT status FROM public.commercial_attributions WHERE id=$1`, [attrOld])).status, 'expired');
  });
  await ok('lead expirado libera a chave de duplicidade para outro representante', async () => {
    const r5 = await rep(db, t4);
    const dk = `reuse-${randomUUID()}`;
    await db.query(`INSERT INTO public.commercial_leads (tenant_id, representative_id, source, company_name, dedupe_key, status) VALUES ($1,$2,'representative','Z',$3,'expired')`, [t4, r4, dk]);
    await db.query(`INSERT INTO public.commercial_leads (tenant_id, representative_id, source, company_name, dedupe_key) VALUES ($1,$2,'representative','Z2',$3)`, [t4, r5, dk]);
  });

  console.log('\n[6] Rollback 238');
  await ok('rollback remove as funções e restaura os tipos de evidência', async () => {
    const d = await freshDb();
    await d.exec(read('supabase/rollbacks/commercial/238_rollback.sql'));
    eq((await row(d, `SELECT count(*)::int AS n FROM pg_proc WHERE proname LIKE 'commercial\\_%\\_lead%' OR proname IN ('commercial_convert_lead','commercial_expire_stale','commercial_confirm_attribution')`)).n, 0);
    for (const f of MIGRATIONS.slice(10)) await d.exec(read(`supabase/migrations/${f}`));
  });
  await ok('rollback recusa se evidências já usam os tipos novos', async () => {
    const d = await freshDb();
    const t = await tenant(d); const r = await rep(d, t);
    await d.query(`INSERT INTO public.commercial_referral_evidence (tenant_id, representative_id, evidence_type) VALUES ($1,$2,'lead_conversion')`, [t, r]);
    let refused = null;
    try { await d.exec(read('supabase/rollbacks/commercial/238_rollback.sql')); } catch (e) { refused = e; }
    if (!refused || !/recusado/i.test(refused.message)) throw new Error('rollback deveria recusar');
  });

  console.log('\n================================================================');
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  if (failed > 0) { console.log('\nFalhas:'); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
}

main().catch((e) => { console.error('ERRO FATAL NA SUÍTE:', e); process.exit(1); });
