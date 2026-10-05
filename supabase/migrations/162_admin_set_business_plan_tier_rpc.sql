-- 162 - Alteração administrativa do plano comercial da empresa por RPC auditada.
--
-- businesses.plan_tier é gerenciado pelo servidor (guard_legacy_business_plan_tier):
-- clientes não podem alterá-lo diretamente. Esta função é o caminho server-side
-- autorizado. Roda como dono da função (postgres), por isso passa pelo guard, e
-- valida antes que o chamador é admin de plataforma com acesso ao tenant da empresa.

CREATE OR REPLACE FUNCTION public.admin_set_business_plan_tier(
  p_business_id uuid,
  p_plan_code text,
  p_justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_biz public.businesses%ROWTYPE;
  v_new text;
  v_old text;
BEGIN
  IF NOT public.has_platform_admin_access() THEN
    RAISE EXCEPTION 'FORBIDDEN: requer acesso de admin de plataforma';
  END IF;

  v_new := lower(btrim(COALESCE(p_plan_code, '')));
  IF v_new NOT IN ('esquadro', 'compasso', 'acacia') THEN
    RAISE EXCEPTION 'INVALID_PLAN: plano % não existe', p_plan_code;
  END IF;

  SELECT * INTO v_biz
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: empresa não localizada';
  END IF;

  IF NOT public.has_tenant_admin_access(v_biz.tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: sem acesso administrativo ao tenant da empresa';
  END IF;

  v_old := v_biz.plan_tier;

  UPDATE public.businesses
  SET plan_tier = v_new,
      updated_at = now()
  WHERE id = v_biz.id;

  RETURN jsonb_build_object(
    'business_id', v_biz.id,
    'tenant_id', v_biz.tenant_id,
    'slug', v_biz.slug,
    'old_plan', v_old,
    'new_plan', v_new,
    'justification', p_justification
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_business_plan_tier(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_business_plan_tier(uuid, text, text) TO authenticated;
