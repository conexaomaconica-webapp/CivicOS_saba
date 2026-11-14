-- ROLLBACK da migration 243 (motor de comissões, repasses, categorias). Fora de supabase/migrations de propósito.
-- Recusa se existir QUALQUER dado financeiro ou de configuração criado a partir dela: lançamentos no livro-razão,
-- repasses, clawbacks, categorias ou regras por categoria. Apagar isso apagaria a história de comissões.
DO $$
DECLARE
  n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM public.commercial_ledger_entries;
  IF n > 0 THEN RAISE EXCEPTION 'Rollback 243 recusado: % lançamento(s) no livro-razão.', n; END IF;
  SELECT count(*) INTO n FROM public.commercial_payouts;
  IF n > 0 THEN RAISE EXCEPTION 'Rollback 243 recusado: % repasse(s) registrados.', n; END IF;
  SELECT count(*) INTO n FROM public.commercial_clawbacks;
  IF n > 0 THEN RAISE EXCEPTION 'Rollback 243 recusado: % clawback(s) registrados.', n; END IF;
  SELECT count(*) INTO n FROM public.commercial_representative_categories;
  IF n > 0 THEN RAISE EXCEPTION 'Rollback 243 recusado: % categoria(s) de representante.', n; END IF;
  SELECT count(*) INTO n FROM public.commercial_commission_rules WHERE rule_kind = 'category_default';
  IF n > 0 THEN RAISE EXCEPTION 'Rollback 243 recusado: % regra(s) por categoria.', n; END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_close_period(UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.commercial_cancel_payout(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_mark_payout_paid(UUID, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_approve_payout(UUID, UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.commercial_create_payout_draft(UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_release_due(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.commercial_review_event(UUID, UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.commercial_reprocess_events(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_process_pending_events(UUID, INT, UUID);
DROP FUNCTION IF EXISTS public.commercial_process_financial_event(UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_cancel_payout_internal(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_plan_code_canonical(TEXT);

DROP TABLE IF EXISTS public.commercial_clawbacks;
ALTER TABLE public.commercial_payouts DROP CONSTRAINT IF EXISTS commercial_payouts_gross_check;
ALTER TABLE public.commercial_payouts DROP COLUMN IF EXISTS gross_cents, DROP COLUMN IF EXISTS deductions_cents;

-- Regras: volta ao desenho da 230 (guard, tipos de regra e exclusão de sobreposição sem categoria).
ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS fk_commercial_rules_category;
ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_rules_no_overlap;
ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_rules_kind_scope;
ALTER TABLE public.commercial_commission_rules DROP CONSTRAINT IF EXISTS commercial_commission_rules_rule_kind_check;
ALTER TABLE public.commercial_commission_rules DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_commission_rules_rule_kind_check CHECK (rule_kind IN ('plan_default', 'representative_override'));
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_rules_kind_scope CHECK (
    (rule_kind = 'plan_default' AND representative_id IS NULL)
    OR (rule_kind = 'representative_override' AND representative_id IS NOT NULL)
  );
ALTER TABLE public.commercial_commission_rules
  ADD CONSTRAINT commercial_rules_no_overlap EXCLUDE USING gist (
    tenant_id WITH =,
    (COALESCE(representative_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
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

ALTER TABLE public.commercial_representatives DROP CONSTRAINT IF EXISTS fk_commercial_representatives_category;
ALTER TABLE public.commercial_representatives DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.commercial_representative_categories;
