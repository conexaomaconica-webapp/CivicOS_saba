-- ============================================================================
-- Migration 255: Fallback de plan_tier na trigger de cota de benefícios (086)
-- ============================================================================
-- Alinha public._trg_enforce_business_benefit_quota() ao mesmo fallback já
-- aplicado para serviços/legado na Migration 205: quando a empresa está ativa
-- (ex.: permuta 100% / parceria sem subscription paga) e _effective_business_plan
-- retorna vazio, resolve o plano via businesses.plan_tier antes de bloquear como 'none'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._trg_enforce_business_benefit_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_effective_plan TEXT;
  v_raw_plan_tier TEXT;
  v_is_active BOOLEAN;
  v_max_benefits INT;
  v_active_count INT;
BEGIN
  -- Lock transacional na empresa pai
  SELECT lower(COALESCE(b.plan_tier, '')), COALESCE(b.is_active, false)
  INTO v_raw_plan_tier, v_is_active
  FROM public.businesses b
  WHERE b.tenant_id = NEW.tenant_id AND b.id = NEW.business_id
  FOR UPDATE;

  -- Resolver código do plano efetivo via assinatura ativa
  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  -- Fallback para empresas ativas (ex.: permuta_100 / parceria) via plan_tier canônico
  IF (v_effective_plan IS NULL OR v_effective_plan = '' OR v_effective_plan = 'none') AND v_is_active THEN
    v_effective_plan := CASE v_raw_plan_tier
      WHEN 'acacia' THEN 'ouro'
      WHEN 'ouro' THEN 'ouro'
      WHEN 'compasso' THEN 'prata'
      WHEN 'prata' THEN 'prata'
      WHEN 'esquadro' THEN 'bronze'
      WHEN 'bronze' THEN 'bronze'
      ELSE NULL
    END;
  END IF;

  -- Buscar limite via sistema de entitlements
  v_max_benefits := public._get_plan_entitlement(NEW.tenant_id, v_effective_plan, 'benefits_limit');

  -- Estados que consomem quota do plano: scheduled, active, paused, exhausted
  IF NEW.status IN ('scheduled', 'active', 'paused', 'exhausted') THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.business_benefits
    WHERE tenant_id = NEW.tenant_id
      AND business_id = NEW.business_id
      AND status IN ('scheduled', 'active', 'paused', 'exhausted')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_active_count + 1) > v_max_benefits THEN
      RAISE EXCEPTION 'LIMIT_EXCEEDED: Cota de benefícios do plano % excedida (Máximo: % benefícios operacionais).',
        UPPER(COALESCE(v_effective_plan, 'none')), v_max_benefits;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

