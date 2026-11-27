import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import {
  getCommercialCampaignByCode,
  isCampaignWindowOpen,
  PEDRA_FUNDAMENTAL_CAMPAIGN_CODE,
  validateCampaignEnrollment,
} from '../campaign-availability-service';
import { getCheckoutMaxInstallments, PEDRA_FUNDAMENTAL_PRICING } from '@/lib/payment/payment-rules-types';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../../../supabase/migrations');

function readMigration(filename: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
}

function createPgSupabaseAdapter(db: PGlite) {
  return {
    rpc: async (fn: string, params: Record<string, any>) => {
      if (fn === 'consume_commercial_campaign_slot') {
        const res = await db.query(
          `SELECT * FROM public.consume_commercial_campaign_slot(
            p_tenant_id => $1::uuid,
            p_campaign_code => $2::text,
            p_business_id => $3::uuid,
            p_target_document => $4::text,
            p_target_email => $5::text,
            p_exception_id => $6::uuid
          )`,
          [
            params.p_tenant_id,
            params.p_campaign_code,
            params.p_business_id ?? null,
            params.p_target_document ?? null,
            params.p_target_email ?? null,
            params.p_exception_id ?? null,
          ]
        );
        return { data: res.rows, error: null };
      }
      return { data: null, error: { message: 'unknown rpc' } };
    },
    from: (table: string) => {
      const filters: Array<{ col: string; val: any }> = [];
      let orderCol: string | null = null;
      let orderAsc = true;
      let limitVal: number | null = null;
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          filters.push({ col, val });
          return builder;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderCol = col;
          orderAsc = opts?.ascending !== false;
          return builder;
        },
        limit: (n: number) => {
          limitVal = n;
          return builder;
        },
        maybeSingle: async () => {
          const where = filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ');
          const sql = `SELECT * FROM public.${table}${where ? ` WHERE ${where}` : ''} LIMIT 1`;
          const res = await db.query(sql, filters.map((f) => f.val));
          return { data: res.rows[0] ?? null, error: null };
        },
        then: async (resolve: any) => {
          const where = filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ');
          const orderSql = orderCol ? ` ORDER BY ${orderCol} ${orderAsc ? 'ASC' : 'DESC'}` : '';
          const limitSql = limitVal ? ` LIMIT ${limitVal}` : '';
          const sql = `SELECT * FROM public.${table}${where ? ` WHERE ${where}` : ''}${orderSql}${limitSql}`;
          const res = await db.query(sql, filters.map((f) => f.val));
          return resolve({ data: res.rows, error: null });
        },
      };
      return builder;
    },
  };
}

describe('Gate 1B — PostgreSQL real (PGlite): Encerramento seguro da Pedra Fundamental', () => {
  let db: PGlite;
  let adapter: ReturnType<typeof createPgSupabaseAdapter>;

  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const ADMIN_ID = '99999999-9999-9999-9999-999999999999';
  const BIZ_PENDING_ID = '33333333-3333-3333-3333-333333333331';

  beforeAll(async () => {
    db = new PGlite();
    adapter = createPgSupabaseAdapter(db);

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      INSERT INTO auth.users (id) VALUES ('${ADMIN_ID}');

      CREATE TABLE public.tenants (id uuid PRIMARY KEY);
      INSERT INTO public.tenants (id) VALUES ('${TENANT_A}'), ('${TENANT_B}');

      CREATE TABLE public.businesses (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL REFERENCES public.tenants(id)
      );
      INSERT INTO public.businesses (id, tenant_id) VALUES ('${BIZ_PENDING_ID}', '${TENANT_A}');

      CREATE TABLE public.commercial_leads (id uuid PRIMARY KEY);

      CREATE TABLE public.business_recognitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL,
        recognition_key text NOT NULL,
        is_active boolean NOT NULL DEFAULT true
      );
      INSERT INTO public.business_recognitions (tenant_id, business_id, recognition_key, is_active)
      VALUES ('${TENANT_A}', '${BIZ_PENDING_ID}', 'pedra_fundamental', true);

      CREATE TABLE public.business_commercial_terms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL UNIQUE,
        plan_code text NOT NULL,
        plan_name text NOT NULL,
        billing_cycle text NOT NULL,
        payment_method text NOT NULL,
        amount_cents integer NOT NULL,
        installments_count integer NOT NULL,
        installment_amount_cents integer NOT NULL,
        is_pedra_fundamental boolean NOT NULL DEFAULT false
      );
      INSERT INTO public.business_commercial_terms (
        tenant_id, business_id, plan_code, plan_name, billing_cycle,
        payment_method, amount_cents, installments_count, installment_amount_cents, is_pedra_fundamental
      ) VALUES (
        '${TENANT_A}', '${BIZ_PENDING_ID}', 'ouro', 'Plano Acácia (Pedra Fundamental)', 'biennial',
        'parcelado', 130000, 4, 32500, true
      );

      CREATE OR REPLACE FUNCTION public.has_platform_admin_access()
      RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true; $$;
    `);

    await db.exec(readMigration('257_commercial_campaigns_pedra_closure.sql'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('seeds PEDRA_FUNDAMENTAL per tenant with 120000/130000 pricing and 24 months duration', async () => {
    const campA = await getCommercialCampaignByCode(adapter, TENANT_A, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE);
    expect(campA.source).toBe('database');
    expect(campA.status).toBe('active');
    expect(campA.payInFullCents).toBe(PEDRA_FUNDAMENTAL_PRICING.payInFullCents);
    expect(campA.installmentTotalCents).toBe(PEDRA_FUNDAMENTAL_PRICING.installmentTotalCents);
    expect(campA.contractDurationMonths).toBe(24);
    expect(campA.redeemedCount).toBe(1);
    expect(isCampaignWindowOpen(campA)).toBe(true);

    const maxInst = getCheckoutMaxInstallments({
      planCode: 'ouro',
      planName: 'Plano Acácia (Pedra Fundamental)',
      isPedraFundamental: true,
    });
    expect(maxInst).toBe(4);
  });

  it('blocks new enrollments when ended, preserves pending completions, and isolates tenants', async () => {
    await db.query(
      `UPDATE public.commercial_campaigns SET status = 'ended', ended_at = now() WHERE tenant_id = $1 AND code = $2`,
      [TENANT_A, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE]
    );

    // Nova adesão convencional no Tenant A deve ser bloqueada no backend
    const blocked = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_A,
      targetDocument: '12345678000199',
      targetEmail: 'novo@empresa.com.br',
      consumeSlot: true,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.mode).toBe('blocked');

    // Tenant B permanece isolado (ativo)
    const tenantBCheck = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_B,
      targetDocument: '98765432000111',
      consumeSlot: false,
    });
    expect(tenantBCheck.allowed).toBe(true);
    expect(tenantBCheck.mode).toBe('active_campaign');

    // Contratação pendente legítima no Tenant A continua permitida
    const pendingAllowed = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_A,
      businessId: BIZ_PENDING_ID,
      consumeSlot: true,
    });
    expect(pendingAllowed.allowed).toBe(true);
    expect(pendingAllowed.mode).toBe('pending_completion');
  });

  it('rejects invalid exceptions and enforces single-use tenant-isolated exceptions', async () => {
    const campA = await getCommercialCampaignByCode(adapter, TENANT_A, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE);

    // Justificativa curta ou sem alvo viola constraints do banco
    await expect(
      db.query(
        `INSERT INTO public.commercial_campaign_exceptions (tenant_id, campaign_id, justification, authorized_by)
         VALUES ($1, $2, 'curta', $3)`,
        [TENANT_A, campA.id, ADMIN_ID]
      )
    ).rejects.toThrow();

    // Insere exceção válida para documento específico no Tenant A
    const excRes = await db.query<{ id: string }>(
      `INSERT INTO public.commercial_campaign_exceptions (
        tenant_id, campaign_id, target_document, target_email, justification, authorized_by
      ) VALUES ($1, $2, '11222333000144', 'negociacao@cliente.com.br', 'Negociação anterior ao encerramento aprovada pela diretoria.', $3)
      RETURNING id`,
      [TENANT_A, campA.id, ADMIN_ID]
    );
    const excId = excRes.rows[0]!.id;

    // Outro documento não consegue usar a exceção
    const wrongDoc = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_A,
      targetDocument: '99999999000199',
      consumeSlot: true,
    });
    expect(wrongDoc.allowed).toBe(false);

    // Documento autorizado consegue consumir exatamente 1 vez
    const firstUse = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_A,
      targetDocument: '11.222.333/0001-44',
      consumeSlot: true,
    });
    expect(firstUse.allowed).toBe(true);
    expect(firstUse.mode).toBe('authorized_exception');
    expect(firstUse.exceptionId).toBe(excId);

    // Segunda tentativa com o mesmo documento já consumido é bloqueada
    const secondUse = await validateCampaignEnrollment(adapter, {
      tenantId: TENANT_A,
      targetDocument: '11222333000144',
      consumeSlot: true,
    });
    expect(secondUse.allowed).toBe(false);
  });

  it('supports rollback and idempotent reapplication without touching business_commercial_terms or recognitions', async () => {
    await db.exec(readMigration('257_commercial_campaigns_pedra_closure.rollback.sql'));

    const termsAfterRollback = await db.query(`SELECT amount_cents, billing_cycle FROM public.business_commercial_terms WHERE business_id = $1`, [BIZ_PENDING_ID]);
    expect(termsAfterRollback.rows[0]).toEqual({ amount_cents: 130000, billing_cycle: 'biennial' });

    const recAfterRollback = await db.query<{ is_active: boolean }>(
      `SELECT is_active FROM public.business_recognitions WHERE business_id = $1`,
      [BIZ_PENDING_ID]
    );
    expect(recAfterRollback.rows[0]?.is_active).toBe(true);

    // Reaplica 255 duas vezes (idempotência)
    await db.exec(readMigration('257_commercial_campaigns_pedra_closure.sql'));
    await db.exec(readMigration('257_commercial_campaigns_pedra_closure.sql'));
    const campReapplied = await getCommercialCampaignByCode(adapter, TENANT_A, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE);
    expect(campReapplied.source).toBe('database');
    expect(campReapplied.contractDurationMonths).toBe(24);
  });
});

