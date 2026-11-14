-- 243 - Módulo Comercial Nacional · Gate 1E · Motor de comissões, liberação, repasses e fechamento
--
-- Tudo em funções SECURITY DEFINER executáveis SOMENTE por service_role (a aplicação confere a permissão comercial antes).
-- Princípios (herdados da 230/232):
--   * NENHUMA regra é criada aqui: sem regra ativa, aprovada e habilitada não há comissão (evento fica 'skipped' e pode ser
--     reprocessado depois). Valores sempre em centavos; taxa em basis points; arredondamento: truncamento (floor).
--   * Comissão só nasce de pagamento EFETIVAMENTE recebido (delta positivo do evento financeiro), de atribuição CONFIRMADA
--     e de representante ativo. Atribuição pendente não gera comissão.
--   * Livro-razão imutável: estorno/chargeback geram lançamento 'reversal' proporcional que referencia o crédito original.
--     Comissão já PAGA que é estornada vira "clawback" e é abatida do próximo repasse (nunca some, nunca é duplicada).
--   * Idempotência por chave em todas as escritas; um evento só é processado uma vez; reprocessar é seguro.
--   * Repasse: rascunho -> aprovado (outra pessoa) -> pago (com comprovante). Estorno após a criação do repasse cancela o
--     repasse ainda não pago. Fechamento exige que não haja eventos pendentes no período.
-- Reversão: supabase/rollbacks/commercial/243_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Categorias de representante e regras por categoria
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_representative_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_categories_code UNIQUE (tenant_id, code),
  CONSTRAINT uq_commercial_categories_tenant_id UNIQUE (tenant_id, id)
);

ALTER TABLE public.commercial_representatives ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.commercial_commission_rules ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commercial_representatives_category') THEN
    ALTER TABLE public.commercial_representatives
      ADD CONSTRAINT fk_commercial_representatives_category
      FOREIGN KEY (tenant_id, category_id) REFERENCES public.commercial_representative_categories (tenant_id, id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commercial_rules_category') THEN
    ALTER TABLE public.commercial_commission_rules
      ADD CONSTRAINT fk_commercial_rules_category
      FOREIGN KEY (tenant_id, category_id) REFERENCES public.commercial_representative_categories (tenant_id, id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_commission_rules_rule_kind_check;
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_commission_rules_rule_kind_check
  CHECK (rule_kind IN ('plan_default', 'category_default', 'representative_override'));

ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_rules_kind_scope;
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_rules_kind_scope CHECK (
    (rule_kind = 'plan_default' AND representative_id IS NULL AND category_id IS NULL)
    OR (rule_kind = 'category_default' AND representative_id IS NULL AND category_id IS NOT NULL)
    OR (rule_kind = 'representative_override' AND representative_id IS NOT NULL AND category_id IS NULL)
  );

ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_rules_no_overlap;
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_rules_no_overlap EXCLUDE USING gist (
    tenant_id WITH =,
    (COALESCE(representative_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    (COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    (COALESCE(plan_code, '*')) WITH =,
    commission_type WITH =,
    priority WITH =,
    tstzrange(effective_from, effective_until, '[)') WITH &&
  ) WHERE (status = 'active');

CREATE OR REPLACE FUNCTION public.commercial_guard_rule_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status IN ('active', 'retired') THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.rule_kind IS DISTINCT FROM OLD.rule_kind
       OR NEW.representative_id IS DISTINCT FROM OLD.representative_id
       OR NEW.category_id IS DISTINCT FROM OLD.category_id
       OR NEW.plan_code IS DISTINCT FROM OLD.plan_code
       OR NEW.commission_type IS DISTINCT FROM OLD.commission_type
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.rate_bps IS DISTINCT FROM OLD.rate_bps
       OR NEW.hold_days IS DISTINCT FROM OLD.hold_days
       OR NEW.min_base_cents IS DISTINCT FROM OLD.min_base_cents
       OR NEW.max_commission_cents IS DISTINCT FROM OLD.max_commission_cents
       OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.is_illustrative IS DISTINCT FROM OLD.is_illustrative
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'Regra de comissão ativa/encerrada é imutável; crie uma nova versão.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.effective_until IS NOT NULL
       AND (NEW.effective_until IS NULL OR NEW.effective_until > OLD.effective_until) THEN
      RAISE EXCEPTION 'A vigência de uma regra não pode ser estendida; crie uma nova versão.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.status = 'retired' AND NEW.status <> 'retired' THEN
      RAISE EXCEPTION 'Regra encerrada não pode ser reativada.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Repasse: bruto, deduções (clawbacks) e tabela de clawbacks
-- ---------------------------------------------------------------------------
ALTER TABLE public.commercial_payouts
  ADD COLUMN IF NOT EXISTS gross_cents BIGINT,
  ADD COLUMN IF NOT EXISTS deductions_cents BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_payouts_gross_check') THEN
    ALTER TABLE public.commercial_payouts
      ADD CONSTRAINT commercial_payouts_gross_check
      CHECK (deductions_cents >= 0 AND (gross_cents IS NULL OR gross_cents - deductions_cents = amount_cents));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.commercial_clawbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  reversal_entry_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  offset_payout_id UUID,
  offset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_clawbacks_reversal UNIQUE (reversal_entry_id),
  CONSTRAINT fk_commercial_clawbacks_representative
    FOREIGN KEY (tenant_id, representative_id) REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_clawbacks_entry
    FOREIGN KEY (tenant_id, reversal_entry_id) REFERENCES public.commercial_ledger_entries (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_clawbacks_payout
    FOREIGN KEY (tenant_id, offset_payout_id) REFERENCES public.commercial_payouts (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_clawbacks_offset_consistency CHECK ((offset_payout_id IS NULL) = (offset_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_commercial_clawbacks_open
  ON public.commercial_clawbacks (tenant_id, representative_id, created_at) WHERE offset_payout_id IS NULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_representative_categories', 'commercial_clawbacks']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Auxiliares
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_plan_code_canonical(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE lower(btrim(coalesce(p, '')))
    WHEN 'bronze' THEN 'esquadro' WHEN 'esquadro' THEN 'esquadro'
    WHEN 'prata' THEN 'compasso' WHEN 'compasso' THEN 'compasso'
    WHEN 'ouro' THEN 'acacia' WHEN 'acacia' THEN 'acacia'
    ELSE NULL END
$$;

-- Cancela um repasse NÃO pago (rascunho/aprovado): remove os itens e devolve os clawbacks abatidos.
CREATE OR REPLACE FUNCTION public.commercial_cancel_payout_internal(p_tenant_id UUID, p_payout_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.commercial_payout_items WHERE tenant_id = p_tenant_id AND payout_id = p_payout_id;
  UPDATE public.commercial_clawbacks SET offset_payout_id = NULL, offset_at = NULL
   WHERE tenant_id = p_tenant_id AND offset_payout_id = p_payout_id;
  UPDATE public.commercial_payouts
     SET status = 'canceled', failure_reason = p_reason, updated_at = now()
   WHERE tenant_id = p_tenant_id AND id = p_payout_id AND status IN ('draft', 'approved', 'failed');
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Motor: um evento financeiro -> crédito (accrual) ou estorno (reversal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_process_financial_event(p_event_id UUID, p_actor UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ev public.commercial_financial_events%ROWTYPE;
  v_set public.commercial_settings%ROWTYPE;
  v_attr public.commercial_attributions%ROWTYPE;
  v_rep public.commercial_representatives%ROWTYPE;
  v_rule public.commercial_commission_rules%ROWTYPE;
  v_acc public.commercial_ledger_entries%ROWTYPE;
  v_plan TEXT;
  v_type TEXT;
  v_base BIGINT;
  v_amount BIGINT;
  v_entry UUID;
  v_rev_entry UUID;
  v_remaining BIGINT;
  v_rem_base BIGINT;
  v_rem_amount BIGINT;
  v_this_base BIGINT;
  v_rev_amount BIGINT;
  v_rev_base_done BIGINT;
  v_rev_amt_done BIGINT;
  v_rel public.commercial_commission_releases%ROWTYPE;
  v_payout RECORD;
  v_created INT := 0;
BEGIN
  SELECT * INTO v_ev FROM public.commercial_financial_events WHERE id = p_event_id FOR UPDATE;
  IF v_ev.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_ev.status IN ('processed', 'skipped') THEN
    RETURN jsonb_build_object('result', 'already_done', 'status', v_ev.status);
  END IF;

  SELECT * INTO v_set FROM public.commercial_settings WHERE tenant_id = v_ev.tenant_id;
  IF v_set.tenant_id IS NULL OR NOT v_set.module_enabled THEN
    RETURN jsonb_build_object('result', 'module_off');
  END IF;
  IF v_ev.requires_review THEN
    RETURN jsonb_build_object('result', 'needs_review');
  END IF;

  IF NOT v_ev.is_monetary THEN
    UPDATE public.commercial_financial_events
       SET status = 'skipped', skip_reason = 'non_monetary_modality', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'non_monetary_modality');
  END IF;

  -- -------------------------------------------------------------------------
  -- 4a. Valor recebido (crédito)
  -- -------------------------------------------------------------------------
  IF v_ev.delta_cents > 0 THEN
    SELECT * INTO v_attr FROM public.commercial_attributions
     WHERE tenant_id = v_ev.tenant_id AND business_id = v_ev.business_id AND status = 'confirmed';
    IF v_attr.id IS NULL THEN
      UPDATE public.commercial_financial_events
         SET status = 'skipped', skip_reason = 'no_confirmed_attribution', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
      RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_confirmed_attribution');
    END IF;

    SELECT * INTO v_rep FROM public.commercial_representatives WHERE tenant_id = v_ev.tenant_id AND id = v_attr.representative_id;
    IF v_rep.id IS NULL OR v_rep.status <> 'active' THEN
      UPDATE public.commercial_financial_events
         SET status = 'skipped', skip_reason = 'representative_not_active', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
      RETURN jsonb_build_object('result', 'skipped', 'reason', 'representative_not_active');
    END IF;

    IF v_ev.event_type = 'chargeback_reversal' THEN
      -- Disputa vencida: o valor volta e a comissão é recriada pela MESMA regra do crédito original.
      SELECT r.* INTO v_rule
        FROM public.commercial_ledger_entries l
        JOIN public.commercial_commission_rules r ON r.tenant_id = l.tenant_id AND r.id = l.rule_id
       WHERE l.tenant_id = v_ev.tenant_id AND l.invoice_id = v_ev.invoice_id AND l.entry_type = 'accrual'
       ORDER BY l.effective_at DESC, l.created_at DESC LIMIT 1;
      IF v_rule.id IS NULL THEN
        UPDATE public.commercial_financial_events
           SET status = 'skipped', skip_reason = 'no_commission_to_restore', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
        RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_commission_to_restore');
      END IF;
    ELSE
      SELECT public.commercial_plan_code_canonical(t.plan_code) INTO v_plan
        FROM public.business_commercial_terms t WHERE t.business_id = v_ev.business_id LIMIT 1;
      v_type := CASE WHEN EXISTS (
        SELECT 1 FROM public.commercial_ledger_entries l
         WHERE l.tenant_id = v_ev.tenant_id AND l.attribution_id = v_attr.id AND l.entry_type = 'accrual'
      ) THEN 'recurring' ELSE 'initial' END;

      SELECT r.* INTO v_rule FROM public.commercial_commission_rules r
       WHERE r.tenant_id = v_ev.tenant_id AND r.status = 'active' AND r.enabled AND NOT r.is_illustrative
         AND r.commission_type = v_type
         AND r.effective_from <= v_ev.occurred_at AND (r.effective_until IS NULL OR r.effective_until > v_ev.occurred_at)
         AND (r.plan_code IS NULL OR r.plan_code = v_plan)
         AND (
           (r.rule_kind = 'representative_override' AND r.representative_id = v_rep.id)
           OR (r.rule_kind = 'category_default' AND v_rep.category_id IS NOT NULL AND r.category_id = v_rep.category_id)
           OR r.rule_kind = 'plan_default'
         )
       ORDER BY CASE r.rule_kind WHEN 'representative_override' THEN 1 WHEN 'category_default' THEN 2 ELSE 3 END,
                (r.plan_code IS NULL), r.priority DESC, r.effective_from DESC
       LIMIT 1;
      IF v_rule.id IS NULL THEN
        UPDATE public.commercial_financial_events
           SET status = 'skipped', skip_reason = 'no_applicable_rule', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
        RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_applicable_rule');
      END IF;
    END IF;

    v_base := v_ev.delta_cents;
    IF v_base < v_rule.min_base_cents THEN
      UPDATE public.commercial_financial_events
         SET status = 'skipped', skip_reason = 'below_min_base', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
      RETURN jsonb_build_object('result', 'skipped', 'reason', 'below_min_base');
    END IF;
    v_amount := floor(v_base::numeric * v_rule.rate_bps / 10000)::BIGINT;
    IF v_rule.max_commission_cents IS NOT NULL THEN v_amount := LEAST(v_amount, v_rule.max_commission_cents); END IF;
    IF v_amount <= 0 THEN
      UPDATE public.commercial_financial_events
         SET status = 'skipped', skip_reason = 'zero_commission', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
      RETURN jsonb_build_object('result', 'skipped', 'reason', 'zero_commission');
    END IF;

    INSERT INTO public.commercial_ledger_entries (
      tenant_id, representative_id, entry_type, amount_cents, attribution_id, financial_event_id, business_id, invoice_id,
      rule_id, base_amount_cents, rate_bps, rule_snapshot, effective_at, idempotency_key, created_by
    ) VALUES (
      v_ev.tenant_id, v_rep.id, 'accrual', v_amount, v_attr.id, v_ev.id, v_ev.business_id, v_ev.invoice_id,
      v_rule.id, v_base, v_rule.rate_bps, to_jsonb(v_rule), v_ev.occurred_at,
      'acc:' || v_ev.id::text || ':' || v_attr.id::text, p_actor
    )
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING id INTO v_entry;

    IF v_entry IS NOT NULL THEN
      INSERT INTO public.commercial_commission_releases (tenant_id, representative_id, ledger_entry_id, status, release_at)
      VALUES (v_ev.tenant_id, v_rep.id, v_entry, 'hold', v_ev.occurred_at + make_interval(days => v_rule.hold_days));
      v_created := 1;
    END IF;

    UPDATE public.commercial_financial_events
       SET status = 'processed', processed_at = now(), attempts = attempts + 1, last_error = NULL, locked_at = NULL, updated_at = now()
     WHERE id = v_ev.id;
    RETURN jsonb_build_object('result', 'accrued', 'amount_cents', v_amount, 'entry_id', v_entry, 'created', v_created = 1);
  END IF;

  -- -------------------------------------------------------------------------
  -- 4b. Valor estornado/contestado (compensação proporcional, do crédito mais novo para o mais antigo)
  -- -------------------------------------------------------------------------
  v_remaining := -v_ev.delta_cents;
  FOR v_acc IN
    SELECT l.* FROM public.commercial_ledger_entries l
     WHERE l.tenant_id = v_ev.tenant_id AND l.invoice_id = v_ev.invoice_id AND l.entry_type = 'accrual'
     ORDER BY l.effective_at DESC, l.created_at DESC
  LOOP
    EXIT WHEN v_remaining <= 0;
    SELECT COALESCE(SUM(-r.amount_cents), 0), COALESCE(SUM(r.base_amount_cents), 0)
      INTO v_rev_amt_done, v_rev_base_done
      FROM public.commercial_ledger_entries r
     WHERE r.tenant_id = v_acc.tenant_id AND r.reference_entry_id = v_acc.id AND r.entry_type = 'reversal';
    v_rem_base := v_acc.base_amount_cents - v_rev_base_done;
    v_rem_amount := v_acc.amount_cents - v_rev_amt_done;
    IF v_rem_base <= 0 OR v_rem_amount <= 0 THEN CONTINUE; END IF;

    v_this_base := LEAST(v_remaining, v_rem_base);
    v_rev_amount := CASE
      WHEN v_this_base = v_rem_base THEN v_rem_amount
      ELSE LEAST(v_rem_amount, round(v_acc.amount_cents::numeric * v_this_base / v_acc.base_amount_cents)::BIGINT)
    END;
    v_remaining := v_remaining - v_this_base;
    IF v_rev_amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.commercial_ledger_entries (
      tenant_id, representative_id, entry_type, amount_cents, attribution_id, financial_event_id, business_id, invoice_id,
      rule_id, base_amount_cents, rate_bps, rule_snapshot, reference_entry_id, effective_at, reason, idempotency_key, created_by
    ) VALUES (
      v_acc.tenant_id, v_acc.representative_id, 'reversal', -v_rev_amount, v_acc.attribution_id, v_ev.id, v_acc.business_id, v_acc.invoice_id,
      v_acc.rule_id, v_this_base, v_acc.rate_bps, v_acc.rule_snapshot, v_acc.id, v_ev.occurred_at,
      'Estorno proporcional (' || v_ev.event_type || ')', 'rev:' || v_ev.id::text || ':' || v_acc.id::text, p_actor
    )
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING id INTO v_rev_entry;
    IF v_rev_entry IS NULL THEN CONTINUE; END IF;
    v_created := v_created + 1;

    SELECT * INTO v_rel FROM public.commercial_commission_releases WHERE ledger_entry_id = v_acc.id FOR UPDATE;
    IF v_rel.id IS NOT NULL THEN
      IF v_rel.status = 'paid' THEN
        -- Já repassada: vira débito do representante, abatido do próximo repasse.
        INSERT INTO public.commercial_clawbacks (tenant_id, representative_id, reversal_entry_id, amount_cents)
        VALUES (v_acc.tenant_id, v_acc.representative_id, v_rev_entry, v_rev_amount)
        ON CONFLICT (reversal_entry_id) DO NOTHING;
      ELSE
        -- Repasse ainda não pago que contém este crédito: os valores mudaram, o repasse é cancelado.
        FOR v_payout IN
          SELECT p.id FROM public.commercial_payout_items pi
            JOIN public.commercial_payouts p ON p.tenant_id = pi.tenant_id AND p.id = pi.payout_id
           WHERE pi.release_id = v_rel.id AND p.status IN ('draft', 'approved')
        LOOP
          PERFORM public.commercial_cancel_payout_internal(v_acc.tenant_id, v_payout.id,
            'Cancelado automaticamente: estorno/chargeback após a criação do repasse.');
        END LOOP;
        IF v_rev_amount >= v_rem_amount AND v_rel.status IN ('hold', 'released', 'blocked') THEN
          UPDATE public.commercial_commission_releases SET status = 'reversed', updated_at = now() WHERE id = v_rel.id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF v_created = 0 THEN
    UPDATE public.commercial_financial_events
       SET status = 'skipped', skip_reason = 'no_commission_to_reverse', processed_at = now(), updated_at = now() WHERE id = v_ev.id;
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_commission_to_reverse');
  END IF;

  UPDATE public.commercial_financial_events
     SET status = 'processed', processed_at = now(), attempts = attempts + 1, last_error = NULL, locked_at = NULL, updated_at = now()
   WHERE id = v_ev.id;
  RETURN jsonb_build_object('result', 'reversed', 'entries', v_created);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Processar fila, reprocessar pulados, decidir revisões e liberar carência
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_process_pending_events(p_tenant_id UUID, p_limit INT DEFAULT 200, p_actor UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
  v_res JSONB;
  v_processed INT := 0;
  v_skipped INT := 0;
  v_failed INT := 0;
  v_waiting INT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('commercial_engine:' || p_tenant_id::text, 0));
  FOR v_id IN
    SELECT e.id FROM public.commercial_financial_events e
     WHERE e.tenant_id = p_tenant_id AND e.status IN ('pending', 'failed')
     ORDER BY e.occurred_at, e.created_at, e.id
     LIMIT GREATEST(1, LEAST(p_limit, 1000))
  LOOP
    BEGIN
      v_res := public.commercial_process_financial_event(v_id, p_actor);
      IF v_res->>'result' IN ('accrued', 'reversed') THEN v_processed := v_processed + 1;
      ELSIF v_res->>'result' = 'skipped' THEN v_skipped := v_skipped + 1;
      ELSE v_waiting := v_waiting + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      UPDATE public.commercial_financial_events
         SET status = 'failed', attempts = attempts + 1, last_error = left(SQLERRM, 500), updated_at = now() WHERE id = v_id;
    END;
  END LOOP;
  RETURN jsonb_build_object('processed', v_processed, 'skipped', v_skipped, 'failed', v_failed, 'waiting', v_waiting);
END;
$$;

-- Reabre eventos pulados por falta de atribuição/regra/representante ativo (após a equipe corrigir a causa) e processa.
CREATE OR REPLACE FUNCTION public.commercial_reprocess_events(p_tenant_id UUID, p_business_id UUID DEFAULT NULL, p_actor UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reopened INT;
  v_res JSONB;
BEGIN
  UPDATE public.commercial_financial_events
     SET status = 'pending', skip_reason = NULL, processed_at = NULL, updated_at = now()
   WHERE tenant_id = p_tenant_id AND status = 'skipped'
     AND skip_reason IN ('no_confirmed_attribution', 'no_applicable_rule', 'representative_not_active', 'below_min_base', 'zero_commission')
     AND (p_business_id IS NULL OR business_id = p_business_id);
  GET DIAGNOSTICS v_reopened = ROW_COUNT;
  v_res := public.commercial_process_pending_events(p_tenant_id, 1000, p_actor);
  RETURN v_res || jsonb_build_object('reopened', v_reopened);
END;
$$;

-- Decisão humana sobre evento que exige revisão (redução de valor sem estorno do provedor, etc.).
CREATE OR REPLACE FUNCTION public.commercial_review_event(p_tenant_id UUID, p_event_id UUID, p_decision TEXT, p_note TEXT, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ev public.commercial_financial_events%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('process', 'dismiss') THEN RETURN jsonb_build_object('result', 'invalid_decision'); END IF;
  IF p_note IS NULL OR length(btrim(p_note)) < 10 THEN RETURN jsonb_build_object('result', 'note_required'); END IF;
  SELECT * INTO v_ev FROM public.commercial_financial_events WHERE tenant_id = p_tenant_id AND id = p_event_id FOR UPDATE;
  IF v_ev.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF NOT v_ev.requires_review OR v_ev.status NOT IN ('pending', 'failed') THEN RETURN jsonb_build_object('result', 'not_reviewable'); END IF;

  IF p_decision = 'dismiss' THEN
    UPDATE public.commercial_financial_events
       SET status = 'skipped', skip_reason = 'review_dismissed', processed_at = now(), updated_at = now(),
           source_ref = source_ref || jsonb_build_object('review', jsonb_build_object('decision', 'dismiss', 'by', p_actor, 'note', p_note))
     WHERE id = v_ev.id;
    RETURN jsonb_build_object('result', 'dismissed');
  END IF;

  UPDATE public.commercial_financial_events
     SET requires_review = false, updated_at = now(),
         source_ref = source_ref || jsonb_build_object('review', jsonb_build_object('decision', 'process', 'by', p_actor, 'note', p_note))
   WHERE id = v_ev.id;
  RETURN public.commercial_process_financial_event(v_ev.id, p_actor);
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_release_due(p_tenant_id UUID, p_now TIMESTAMPTZ DEFAULT now())
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  n INT;
BEGIN
  UPDATE public.commercial_commission_releases
     SET status = 'released', released_at = p_now, updated_at = now()
   WHERE tenant_id = p_tenant_id AND status = 'hold' AND release_at <= p_now;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Repasses: rascunho -> aprovado -> pago (ou cancelado)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_create_payout_draft(
  p_tenant_id UUID, p_representative_id UUID, p_actor UUID, p_period_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rep public.commercial_representatives%ROWTYPE;
  v_gross BIGINT := 0;
  v_deduct BIGINT := 0;
  v_payout UUID;
  v_cb RECORD;
  v_cb_ids UUID[] := ARRAY[]::UUID[];
  v_release_ids UUID[];
  v_amounts BIGINT[];
BEGIN
  SELECT * INTO v_rep FROM public.commercial_representatives WHERE tenant_id = p_tenant_id AND id = p_representative_id FOR UPDATE;
  IF v_rep.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_rep.status NOT IN ('active', 'suspended', 'terminated') THEN RETURN jsonb_build_object('result', 'representative_not_eligible'); END IF;
  IF v_rep.pix_key_type IS NULL OR v_rep.pix_key_encrypted IS NULL THEN RETURN jsonb_build_object('result', 'missing_pix'); END IF;
  IF EXISTS (SELECT 1 FROM public.commercial_payouts WHERE tenant_id = p_tenant_id AND representative_id = v_rep.id AND status IN ('draft', 'approved')) THEN
    RETURN jsonb_build_object('result', 'open_payout_exists');
  END IF;

  SELECT COALESCE(array_agg(x.release_id), ARRAY[]::UUID[]), COALESCE(array_agg(x.payable), ARRAY[]::BIGINT[]), COALESCE(SUM(x.payable), 0)
    INTO v_release_ids, v_amounts, v_gross
    FROM (
      SELECT rel.id AS release_id,
             l.amount_cents + COALESCE((
               SELECT SUM(r.amount_cents) FROM public.commercial_ledger_entries r
                WHERE r.tenant_id = l.tenant_id AND r.reference_entry_id = l.id AND r.entry_type = 'reversal'), 0) AS payable
        FROM public.commercial_commission_releases rel
        JOIN public.commercial_ledger_entries l ON l.id = rel.ledger_entry_id
       WHERE rel.tenant_id = p_tenant_id AND rel.representative_id = v_rep.id AND rel.status = 'released'
         AND NOT EXISTS (SELECT 1 FROM public.commercial_payout_items pi WHERE pi.release_id = rel.id)
    ) x
   WHERE x.payable > 0;
  IF v_gross <= 0 THEN RETURN jsonb_build_object('result', 'nothing_to_pay'); END IF;

  -- Clawbacks em aberto são abatidos (do mais antigo), sempre deixando valor líquido positivo.
  FOR v_cb IN
    SELECT id, amount_cents FROM public.commercial_clawbacks
     WHERE tenant_id = p_tenant_id AND representative_id = v_rep.id AND offset_payout_id IS NULL ORDER BY created_at, id
  LOOP
    EXIT WHEN v_deduct + v_cb.amount_cents >= v_gross;
    v_deduct := v_deduct + v_cb.amount_cents;
    v_cb_ids := v_cb_ids || v_cb.id;
  END LOOP;

  INSERT INTO public.commercial_payouts (
    tenant_id, representative_id, period_id, amount_cents, gross_cents, deductions_cents, status, pix_key_type, pix_key_hint, created_by
  ) VALUES (
    p_tenant_id, v_rep.id, p_period_id, v_gross - v_deduct, v_gross, v_deduct, 'draft', v_rep.pix_key_type, v_rep.pix_key_hint, p_actor
  ) RETURNING id INTO v_payout;

  INSERT INTO public.commercial_payout_items (tenant_id, payout_id, release_id, amount_cents)
  SELECT p_tenant_id, v_payout, u.rid, u.amt FROM unnest(v_release_ids, v_amounts) AS u(rid, amt);

  IF array_length(v_cb_ids, 1) IS NOT NULL THEN
    UPDATE public.commercial_clawbacks SET offset_payout_id = v_payout, offset_at = now() WHERE id = ANY (v_cb_ids);
  END IF;

  RETURN jsonb_build_object('result', 'created', 'payout_id', v_payout, 'gross_cents', v_gross, 'deductions_cents', v_deduct, 'amount_cents', v_gross - v_deduct);
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_approve_payout(p_tenant_id UUID, p_payout_id UUID, p_actor UUID, p_allow_same_person BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_p public.commercial_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_p FROM public.commercial_payouts WHERE tenant_id = p_tenant_id AND id = p_payout_id FOR UPDATE;
  IF v_p.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_p.status <> 'draft' THEN RETURN jsonb_build_object('result', 'invalid_status', 'status', v_p.status); END IF;
  IF NOT COALESCE(p_allow_same_person, false) AND v_p.created_by IS NOT DISTINCT FROM p_actor THEN
    RETURN jsonb_build_object('result', 'same_person');
  END IF;
  UPDATE public.commercial_payouts SET status = 'approved', approved_by = p_actor, approved_at = now(), updated_at = now() WHERE id = v_p.id;
  RETURN jsonb_build_object('result', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_mark_payout_paid(
  p_tenant_id UUID, p_payout_id UUID, p_actor UUID, p_proof_document_id UUID, p_external_reference TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_p public.commercial_payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_p FROM public.commercial_payouts WHERE tenant_id = p_tenant_id AND id = p_payout_id FOR UPDATE;
  IF v_p.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_p.status <> 'approved' THEN RETURN jsonb_build_object('result', 'invalid_status', 'status', v_p.status); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_representative_documents d
     WHERE d.tenant_id = p_tenant_id AND d.id = p_proof_document_id AND d.representative_id = v_p.representative_id AND d.doc_type = 'payout_proof'
  ) THEN
    RETURN jsonb_build_object('result', 'proof_required');
  END IF;

  INSERT INTO public.commercial_ledger_entries (
    tenant_id, representative_id, entry_type, amount_cents, payout_id, period_id, effective_at, idempotency_key, created_by
  ) VALUES (
    p_tenant_id, v_p.representative_id, 'payout', -v_p.amount_cents, v_p.id, v_p.period_id, now(), 'payout:' || v_p.id::text, p_actor
  ) ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

  UPDATE public.commercial_commission_releases SET status = 'paid', updated_at = now()
   WHERE tenant_id = p_tenant_id AND id IN (SELECT release_id FROM public.commercial_payout_items WHERE payout_id = v_p.id);
  UPDATE public.commercial_payouts
     SET status = 'paid', paid_by = p_actor, paid_at = now(), proof_document_id = p_proof_document_id,
         external_reference = NULLIF(btrim(COALESCE(p_external_reference, '')), ''), updated_at = now()
   WHERE id = v_p.id;
  RETURN jsonb_build_object('result', 'paid', 'amount_cents', v_p.amount_cents);
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_cancel_payout(p_tenant_id UUID, p_payout_id UUID, p_actor UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_p public.commercial_payouts%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN RETURN jsonb_build_object('result', 'reason_required'); END IF;
  SELECT * INTO v_p FROM public.commercial_payouts WHERE tenant_id = p_tenant_id AND id = p_payout_id FOR UPDATE;
  IF v_p.id IS NULL THEN RETURN jsonb_build_object('result', 'not_found'); END IF;
  IF v_p.status NOT IN ('draft', 'approved') THEN RETURN jsonb_build_object('result', 'invalid_status', 'status', v_p.status); END IF;
  PERFORM public.commercial_cancel_payout_internal(p_tenant_id, v_p.id, btrim(p_reason));
  RETURN jsonb_build_object('result', 'canceled');
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Fechamento de período (congela totais; exige fila de eventos do período resolvida)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commercial_close_period(p_tenant_id UUID, p_start DATE, p_end DATE, p_actor UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
  v_pending BIGINT;
  v_totals JSONB;
BEGIN
  IF p_end <= p_start THEN RETURN jsonb_build_object('result', 'invalid_range'); END IF;
  IF p_end > current_date THEN RETURN jsonb_build_object('result', 'period_not_finished'); END IF;
  IF EXISTS (SELECT 1 FROM public.commercial_closing_periods WHERE tenant_id = p_tenant_id AND daterange(period_start, period_end, '[)') && daterange(p_start, p_end, '[)')) THEN
    RETURN jsonb_build_object('result', 'overlaps_existing_period');
  END IF;

  SELECT count(*) INTO v_pending FROM public.commercial_financial_events e
   WHERE e.tenant_id = p_tenant_id AND e.status IN ('pending', 'processing', 'failed')
     AND e.occurred_at >= p_start::timestamptz AND e.occurred_at < p_end::timestamptz;
  IF v_pending > 0 THEN RETURN jsonb_build_object('result', 'pending_events', 'count', v_pending); END IF;

  SELECT jsonb_build_object(
    'accrued_cents', COALESCE(SUM(l.amount_cents) FILTER (WHERE l.entry_type = 'accrual'), 0),
    'reversed_cents', COALESCE(SUM(l.amount_cents) FILTER (WHERE l.entry_type = 'reversal'), 0),
    'adjusted_cents', COALESCE(SUM(l.amount_cents) FILTER (WHERE l.entry_type = 'adjustment'), 0),
    'paid_cents', COALESCE(-SUM(l.amount_cents) FILTER (WHERE l.entry_type IN ('payout', 'payout_reversal')), 0),
    'entries', count(*)
  ) INTO v_totals
  FROM public.commercial_ledger_entries l
  WHERE l.tenant_id = p_tenant_id AND l.effective_at >= p_start::timestamptz AND l.effective_at < p_end::timestamptz;

  INSERT INTO public.commercial_closing_periods (tenant_id, period_start, period_end, status, closed_at, closed_by, totals)
  VALUES (p_tenant_id, p_start, p_end, 'closed', now(), p_actor, v_totals)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('result', 'closed', 'period_id', v_id, 'totals', v_totals);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Permissões: somente service_role
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'commercial_cancel_payout_internal(uuid,uuid,text)',
    'commercial_process_financial_event(uuid,uuid)',
    'commercial_process_pending_events(uuid,integer,uuid)',
    'commercial_reprocess_events(uuid,uuid,uuid)',
    'commercial_review_event(uuid,uuid,text,text,uuid)',
    'commercial_release_due(uuid,timestamptz)',
    'commercial_create_payout_draft(uuid,uuid,uuid,uuid)',
    'commercial_approve_payout(uuid,uuid,uuid,boolean)',
    'commercial_mark_payout_paid(uuid,uuid,uuid,uuid,text)',
    'commercial_cancel_payout(uuid,uuid,uuid,text)',
    'commercial_close_period(uuid,date,date,uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
