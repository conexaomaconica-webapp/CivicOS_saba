-- Herança arquitetural Ouro Fundador -> Ouro
-- Ao invés de duplicar dados na tabela, a função resolve internamente para 'ouro' se a chamada for para 'ouro_founder'.

CREATE OR REPLACE FUNCTION public._get_plan_entitlement(
  p_tenant_id UUID,
  p_plan_code TEXT,
  p_feature_code TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_limit INTEGER;
  v_resolved_plan_code TEXT := p_plan_code;
BEGIN
  -- Regra Central de Herança
  IF LOWER(v_resolved_plan_code) = 'ouro_founder' THEN
    v_resolved_plan_code := 'ouro';
  END IF;

  SELECT max_limit INTO v_limit
  FROM public.plan_entitlements
  WHERE tenant_id = p_tenant_id
    AND LOWER(plan_code) = LOWER(v_resolved_plan_code)
    AND LOWER(feature_code) = LOWER(p_feature_code);

  IF v_limit IS NULL THEN
    -- Fail-closed default se a cota não estiver explicitamente configurada
    RETURN 0;
  END IF;

  RETURN v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
