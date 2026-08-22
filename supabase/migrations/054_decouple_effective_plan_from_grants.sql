-- ============================================================================
-- Migration 054: Decouple _effective_business_plan from entitlement_grants
-- ============================================================================
-- A migração 044 substituiu a tabela `entitlement_grants` pela arquitetura
-- centralizada em `plan_entitlements`. Porém, `_effective_business_plan` ainda 
-- validava a existência de grants ativos, o que quebra o acesso de negócios que
-- não possuem mais a tabela legada.
-- 
-- Esta migration atualiza a função para considerar qualquer subscription 
-- `active/past_due/trialing` válida sem depender de `entitlement_grants`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._effective_business_plan(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS TABLE (
  subscription_id UUID,
  plan_version_id UUID,
  plan_code TEXT,
  subscription_status TEXT,
  access_valid_until TIMESTAMPTZ,
  is_in_grace BOOLEAN,
  entitlements JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH eligible AS (
    SELECT
      s.id AS subscription_id,
      s.plan_version_id,
      p.code AS plan_code,
      s.status AS subscription_status,
      CASE
        WHEN s.status = 'past_due' THEN s.grace_until
        WHEN s.status = 'canceled' THEN s.access_ends_at
        ELSE s.current_period_end
      END AS access_valid_until,
      s.status = 'past_due' AS is_in_grace
    FROM public.subscriptions s
    JOIN public.plan_versions pv ON pv.id = s.plan_version_id
    JOIN public.plans p ON p.id = pv.plan_id AND p.tenant_id = s.tenant_id
    WHERE s.tenant_id = p_tenant_id
      AND s.business_id = p_business_id
      AND (
        (s.status IN ('active', 'trialing')
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND (s.current_period_end IS NULL OR statement_timestamp() < s.current_period_end))
        OR
        (s.status = 'past_due'
         AND s.grace_until IS NOT NULL
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND statement_timestamp() < s.grace_until)
        OR
        (s.status = 'canceled'
         AND s.access_ends_at IS NOT NULL
         AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
         AND statement_timestamp() < s.access_ends_at)
      )
  ),
  unique_candidate AS (
    -- Ambiguidade comercial falha fechada; nunca escolhe o plano "mais alto".
    SELECT e.*
    FROM eligible e
    WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT
    c.subscription_id,
    c.plan_version_id,
    c.plan_code,
    c.subscription_status,
    c.access_valid_until,
    c.is_in_grace,
    '{}'::jsonb AS entitlements -- Legado, removido em favor de plan_entitlements
  FROM unique_candidate c;
$$;

-- Restaura as permissões corretas
ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID) TO service_role;
