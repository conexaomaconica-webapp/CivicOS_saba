-- 230 - Módulo Comercial Nacional · Gate 1A · Regras de comissão versionadas
--
-- NENHUMA regra é semeada. Regra "ilustrativa" (ex.: 15% de simulação) NUNCA pode ser habilitada.
-- Regra ativa exige aprovação registrada e não pode ter seus parâmetros alterados: para mudar,
-- cria-se nova versão e encerra-se a anterior (vigências do mesmo escopo/prioridade não se sobrepõem).
-- Reversão: supabase/rollbacks/commercial/230_rollback.sql

CREATE TABLE IF NOT EXISTS public.commercial_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  rule_kind TEXT NOT NULL CHECK (rule_kind IN ('plan_default', 'representative_override')),
  representative_id UUID,
  -- Código canônico do plano (Esquadro/Compasso/Acácia). NULL = qualquer plano.
  plan_code TEXT CHECK (plan_code IS NULL OR plan_code IN ('esquadro', 'compasso', 'acacia')),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('initial', 'renewal', 'recurring')),
  priority INT NOT NULL DEFAULT 0 CHECK (priority >= 0),
  rate_bps INT NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  hold_days INT NOT NULL DEFAULT 30 CHECK (hold_days BETWEEN 0 AND 365),
  min_base_cents BIGINT NOT NULL DEFAULT 0 CHECK (min_base_cents >= 0),
  max_commission_cents BIGINT CHECK (max_commission_cents IS NULL OR max_commission_cents > 0),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  supersedes_rule_id UUID REFERENCES public.commercial_commission_rules(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  is_illustrative BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_commission_rules_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_rules_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_rules_kind_scope CHECK (
    (rule_kind = 'plan_default' AND representative_id IS NULL)
    OR (rule_kind = 'representative_override' AND representative_id IS NOT NULL)
  ),
  CONSTRAINT commercial_rules_period CHECK (effective_until IS NULL OR effective_until > effective_from),
  CONSTRAINT commercial_rules_active_requires_approval
    CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT commercial_rules_enabled_requires_active CHECK (NOT enabled OR status = 'active'),
  CONSTRAINT commercial_rules_illustrative_never_enabled CHECK (NOT enabled OR NOT is_illustrative),
  -- Sem sobreposição de vigência para regras ativas do mesmo escopo e prioridade.
  CONSTRAINT commercial_rules_no_overlap EXCLUDE USING gist (
    tenant_id WITH =,
    (COALESCE(representative_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    (COALESCE(plan_code, '*')) WITH =,
    commission_type WITH =,
    priority WITH =,
    tstzrange(effective_from, effective_until, '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_commercial_rules_lookup
  ON public.commercial_commission_rules (tenant_id, commission_type, plan_code, effective_from)
  WHERE status = 'active' AND enabled;
CREATE INDEX IF NOT EXISTS idx_commercial_rules_representative
  ON public.commercial_commission_rules (tenant_id, representative_id) WHERE representative_id IS NOT NULL;

-- Preserva as condições aplicadas a vendas anteriores: regra ativa/encerrada não muda de parâmetros.
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
    -- A vigência só pode ser ENCERRADA ou ANTECIPADA, nunca estendida.
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

CREATE OR REPLACE FUNCTION public.commercial_guard_rule_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Somente regras em rascunho podem ser excluídas.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_rules_update_guard ON public.commercial_commission_rules;
CREATE TRIGGER trg_commercial_rules_update_guard
  BEFORE UPDATE ON public.commercial_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.commercial_guard_rule_update();

DROP TRIGGER IF EXISTS trg_commercial_rules_delete_guard ON public.commercial_commission_rules;
CREATE TRIGGER trg_commercial_rules_delete_guard
  BEFORE DELETE ON public.commercial_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.commercial_guard_rule_delete();

-- ---------------------------------------------------------------------------
-- updated_at + RLS habilitada + sem acesso direto (service_role apenas)
-- ---------------------------------------------------------------------------
ALTER TABLE public.commercial_commission_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_commission_rules FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.commercial_commission_rules TO service_role;
DROP POLICY IF EXISTS commercial_commission_rules_service_role_all ON public.commercial_commission_rules;
CREATE POLICY commercial_commission_rules_service_role_all
  ON public.commercial_commission_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_commercial_commission_rules_updated_at ON public.commercial_commission_rules;
CREATE TRIGGER trg_commercial_commission_rules_updated_at
  BEFORE UPDATE ON public.commercial_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

NOTIFY pgrst, 'reload schema';
