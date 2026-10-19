-- 207 - Contrato público explícito de plano contratado versus efetivo
-- Ambiente local de homologação. Não aplicar remotamente sem revisão.

-- Preserva a implementação JSONB vigente sob um nome interno para que o novo
-- contrato possa acrescentar campos sem alterar a assinatura dos consumidores.
ALTER FUNCTION public.public_business_detail(TEXT, TEXT)
  RENAME TO _public_business_detail_legacy;

ALTER FUNCTION public._public_business_detail_legacy(TEXT, TEXT)
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public._public_business_detail_legacy(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._public_business_detail_legacy(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_business_detail(
  p_host TEXT,
  p_business_slug TEXT
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_row JSONB;
  v_business_id UUID;
  v_tenant_id UUID;
  v_contracted_plan TEXT;
  v_effective_plan TEXT;
  v_effective_access BOOLEAN;
BEGIN
  FOR v_row IN
    SELECT r
    FROM public._public_business_detail_legacy(p_host, p_business_slug) AS r
  LOOP
    v_business_id := NULLIF(v_row ->> 'business_id', '')::UUID;
    v_tenant_id := public._resolve_public_tenant_id(p_host);

    SELECT b.plan_tier
      INTO v_contracted_plan
    FROM public.businesses AS b
    WHERE b.id = v_business_id
      AND b.tenant_id = v_tenant_id;

    SELECT e.plan_code
      INTO v_effective_plan
    FROM public._effective_business_plan(v_tenant_id, v_business_id) AS e;

    v_effective_access := v_effective_plan IS NOT NULL;

    RETURN NEXT v_row || jsonb_build_object(
      'contracted_plan_code', v_contracted_plan,
      'effective_plan_code', v_effective_plan,
      'effective_access', v_effective_access
    );
  END LOOP;

  RETURN;
END;
$$;

ALTER FUNCTION public.public_business_detail(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_business_detail(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_business_detail(TEXT, TEXT)
  TO anon, authenticated;

