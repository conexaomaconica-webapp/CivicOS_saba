-- 208 - Resolucao fail-closed de assinaturas elegiveis ambiguas.
-- Somente local/homologacao nesta etapa; nao aplicar remotamente sem revisao.

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
      s.status = 'past_due' AS is_in_grace,
      '{}'::jsonb AS entitlements
    FROM public.subscriptions AS s
    JOIN public.plan_versions AS pv ON pv.id = s.plan_version_id
    JOIN public.plans AS p ON p.id = pv.plan_id
    WHERE s.tenant_id = p_tenant_id
      AND s.business_id = p_business_id
      AND (
        (s.status IN ('active', 'trialing')
          AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
          AND (s.current_period_end IS NULL OR statement_timestamp() < s.current_period_end))
        OR (s.status = 'past_due' AND s.grace_until IS NOT NULL AND statement_timestamp() < s.grace_until)
        OR (s.status = 'canceled' AND s.access_ends_at IS NOT NULL AND statement_timestamp() < s.access_ends_at)
      )
  )
  SELECT e.subscription_id, e.plan_version_id, e.plan_code,
         e.subscription_status, e.access_valid_until,
         e.is_in_grace, e.entitlements
  FROM eligible AS e
  WHERE (SELECT count(*) FROM eligible) = 1;
$$;

ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
