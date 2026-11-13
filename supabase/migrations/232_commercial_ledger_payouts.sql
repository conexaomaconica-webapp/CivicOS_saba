-- 232 - Módulo Comercial Nacional · Gate 1A · Livro-razão, estado operacional, fechamento e repasses
--
-- commercial_ledger_entries é APPEND-ONLY (UPDATE/DELETE/TRUNCATE bloqueados). Estorno, correção e
-- repasse são lançamentos compensatórios que referenciam o original; nada "volta" ao status anterior.
-- O ESTADO operacional (carência, liberação, pagamento) vive em commercial_commission_releases, uma
-- projeção mutável separada, para nunca precisar alterar lançamentos históricos.
-- Valores em BIGINT (centavos) e taxas em basis points. Reversão: supabase/rollbacks/commercial/232_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. commercial_closing_periods · fechamento mensal (períodos não se sobrepõem)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_closing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_closing_periods_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT commercial_closing_periods_range CHECK (period_end > period_start),
  CONSTRAINT commercial_closing_periods_closed_consistency CHECK ((status = 'closed') = (closed_at IS NOT NULL)),
  CONSTRAINT commercial_closing_periods_no_overlap EXCLUDE USING gist (
    tenant_id WITH =, daterange(period_start, period_end, '[)') WITH &&
  )
);

-- ---------------------------------------------------------------------------
-- 2. commercial_payouts / commercial_payout_items · repasse PIX manual conciliado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  period_id UUID,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  method TEXT NOT NULL DEFAULT 'pix_manual' CHECK (method IN ('pix_manual')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'failed', 'canceled')),
  pix_key_type TEXT,
  pix_key_hint TEXT,
  proof_document_id UUID,
  external_reference TEXT,
  failure_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_payouts_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_payouts_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_payouts_period
    FOREIGN KEY (tenant_id, period_id)
    REFERENCES public.commercial_closing_periods (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_payouts_proof
    FOREIGN KEY (tenant_id, proof_document_id)
    REFERENCES public.commercial_representative_documents (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_payouts_approved_consistency
    CHECK (status NOT IN ('approved', 'paid') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT commercial_payouts_paid_consistency
    CHECK (status <> 'paid' OR (paid_at IS NOT NULL AND paid_by IS NOT NULL AND proof_document_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_commercial_payouts_representative
  ON public.commercial_payouts (tenant_id, representative_id, status);

-- ---------------------------------------------------------------------------
-- 3. commercial_ledger_entries · livro-razão IMUTÁVEL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('accrual', 'reversal', 'adjustment', 'payout', 'payout_reversal')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents <> 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  attribution_id UUID,
  financial_event_id UUID,
  business_id UUID,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
  rule_id UUID,
  base_amount_cents BIGINT CHECK (base_amount_cents IS NULL OR base_amount_cents >= 0),
  rate_bps INT CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
  -- Snapshot completo da regra aplicada (preserva condições mesmo que a regra seja encerrada).
  rule_snapshot JSONB,
  reference_entry_id UUID,
  payout_id UUID,
  period_id UUID,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  idempotency_key TEXT NOT NULL CHECK (length(btrim(idempotency_key)) > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_kind TEXT GENERATED ALWAYS AS (entry_type) STORED,
  CONSTRAINT uq_commercial_ledger_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_commercial_ledger_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT uq_commercial_ledger_id_representative UNIQUE (id, representative_id),
  CONSTRAINT uq_commercial_ledger_id_kind UNIQUE (id, entry_kind),
  CONSTRAINT fk_commercial_ledger_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_attribution
    FOREIGN KEY (tenant_id, attribution_id)
    REFERENCES public.commercial_attributions (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_event
    FOREIGN KEY (tenant_id, financial_event_id)
    REFERENCES public.commercial_financial_events (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_rule
    FOREIGN KEY (tenant_id, rule_id)
    REFERENCES public.commercial_commission_rules (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_payout
    FOREIGN KEY (tenant_id, payout_id)
    REFERENCES public.commercial_payouts (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_ledger_period
    FOREIGN KEY (tenant_id, period_id)
    REFERENCES public.commercial_closing_periods (tenant_id, id) ON DELETE RESTRICT,
  -- Compensação sempre do MESMO representante do lançamento original.
  CONSTRAINT fk_commercial_ledger_reference
    FOREIGN KEY (reference_entry_id, representative_id)
    REFERENCES public.commercial_ledger_entries (id, representative_id) ON DELETE RESTRICT,
  -- Sinal por tipo: créditos positivos; estorno e repasse negativos; ajuste pode ser ±.
  CONSTRAINT commercial_ledger_sign CHECK (
    (entry_type IN ('accrual', 'payout_reversal') AND amount_cents > 0)
    OR (entry_type IN ('reversal', 'payout') AND amount_cents < 0)
    OR entry_type = 'adjustment'
  ),
  CONSTRAINT commercial_ledger_accrual_complete CHECK (
    entry_type <> 'accrual' OR (
      attribution_id IS NOT NULL AND financial_event_id IS NOT NULL AND rule_id IS NOT NULL
      AND rule_snapshot IS NOT NULL AND base_amount_cents IS NOT NULL AND rate_bps IS NOT NULL
    )
  ),
  CONSTRAINT commercial_ledger_reversal_references CHECK (
    entry_type NOT IN ('reversal', 'payout_reversal') OR (reference_entry_id IS NOT NULL AND reason IS NOT NULL)
  ),
  CONSTRAINT commercial_ledger_adjustment_reason CHECK (entry_type <> 'adjustment' OR reason IS NOT NULL),
  CONSTRAINT commercial_ledger_payout_requires_payout CHECK (entry_type <> 'payout' OR payout_id IS NOT NULL)
);

-- Um único crédito por (evento financeiro, atribuição): sem comissão em duplicidade.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_ledger_accrual_per_event
  ON public.commercial_ledger_entries (tenant_id, financial_event_id, attribution_id) WHERE entry_type = 'accrual';
CREATE INDEX IF NOT EXISTS idx_commercial_ledger_representative
  ON public.commercial_ledger_entries (tenant_id, representative_id, effective_at);
CREATE INDEX IF NOT EXISTS idx_commercial_ledger_attribution
  ON public.commercial_ledger_entries (attribution_id) WHERE attribution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commercial_ledger_reference
  ON public.commercial_ledger_entries (reference_entry_id) WHERE reference_entry_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.commercial_ledger_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'commercial_ledger_entries é append-only: use um lançamento compensatório.'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_ledger_no_update ON public.commercial_ledger_entries;
CREATE TRIGGER trg_commercial_ledger_no_update
  BEFORE UPDATE OR DELETE ON public.commercial_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.commercial_ledger_block_mutation();

DROP TRIGGER IF EXISTS trg_commercial_ledger_no_truncate ON public.commercial_ledger_entries;
CREATE TRIGGER trg_commercial_ledger_no_truncate
  BEFORE TRUNCATE ON public.commercial_ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION public.commercial_ledger_block_mutation();

-- ---------------------------------------------------------------------------
-- 4. commercial_commission_releases · ESTADO operacional (mutável), 1 linha por crédito
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_commission_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  ledger_entry_id UUID NOT NULL,
  entry_kind TEXT NOT NULL DEFAULT 'accrual' CHECK (entry_kind = 'accrual'),
  status TEXT NOT NULL DEFAULT 'hold' CHECK (status IN ('hold', 'released', 'blocked', 'paid', 'reversed')),
  release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_releases_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_commercial_releases_entry UNIQUE (ledger_entry_id),
  -- Só créditos (accrual) possuem estado de liberação.
  CONSTRAINT fk_commercial_releases_entry
    FOREIGN KEY (ledger_entry_id, entry_kind)
    REFERENCES public.commercial_ledger_entries (id, entry_kind) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_releases_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_releases_released_consistency
    CHECK (status NOT IN ('released', 'paid') OR released_at IS NOT NULL),
  CONSTRAINT commercial_releases_blocked_consistency
    CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_commercial_releases_due
  ON public.commercial_commission_releases (release_at) WHERE status = 'hold';
CREATE INDEX IF NOT EXISTS idx_commercial_releases_representative
  ON public.commercial_commission_releases (tenant_id, representative_id, status);

CREATE TABLE IF NOT EXISTS public.commercial_payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payout_id UUID NOT NULL,
  release_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Uma comissão liberada só pode compor UM repasse (impede pagamento em duplicidade).
  CONSTRAINT uq_commercial_payout_items_release UNIQUE (release_id),
  CONSTRAINT fk_commercial_payout_items_payout
    FOREIGN KEY (tenant_id, payout_id)
    REFERENCES public.commercial_payouts (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_payout_items_release
    FOREIGN KEY (tenant_id, release_id)
    REFERENCES public.commercial_commission_releases (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_commercial_payout_items_payout
  ON public.commercial_payout_items (tenant_id, payout_id);

-- ---------------------------------------------------------------------------
-- 5. Saldo por representante (projeção derivada do livro-razão; refinada no Gate 1E)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.commercial_representative_balances
WITH (security_invoker = true) AS
SELECT
  l.tenant_id,
  l.representative_id,
  COALESCE(SUM(l.amount_cents) FILTER (WHERE l.entry_type IN ('accrual', 'reversal', 'adjustment')), 0)::BIGINT AS earned_cents,
  COALESCE(-SUM(l.amount_cents) FILTER (WHERE l.entry_type IN ('payout', 'payout_reversal')), 0)::BIGINT AS paid_cents,
  COALESCE(SUM(l.amount_cents), 0)::BIGINT AS owed_cents
FROM public.commercial_ledger_entries l
GROUP BY l.tenant_id, l.representative_id;

-- ---------------------------------------------------------------------------
-- 6. updated_at + RLS habilitada + sem acesso direto (service_role apenas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_closing_periods', 'commercial_payouts', 'commercial_ledger_entries',
    'commercial_commission_releases', 'commercial_payout_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t
    );
  END LOOP;

  FOREACH t IN ARRAY ARRAY['commercial_closing_periods', 'commercial_payouts', 'commercial_commission_releases']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

REVOKE ALL ON public.commercial_representative_balances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commercial_representative_balances TO service_role;

NOTIFY pgrst, 'reload schema';
