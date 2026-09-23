-- Unifica a resolução do plano usada por eventos, posts e triggers de cotas.
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
  FROM public.subscriptions s
  JOIN public.plan_versions pv ON pv.id = s.plan_version_id
  JOIN public.plans p ON p.id = pv.plan_id
  WHERE s.tenant_id = p_tenant_id
    AND s.business_id = p_business_id
    AND (
      (s.status IN ('active', 'trialing')
        AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
        AND (s.current_period_end IS NULL OR statement_timestamp() < s.current_period_end))
      OR (s.status = 'past_due' AND s.grace_until IS NOT NULL AND statement_timestamp() < s.grace_until)
      OR (s.status = 'canceled' AND s.access_ends_at IS NOT NULL AND statement_timestamp() < s.access_ends_at)
    )
  ORDER BY s.created_at DESC, s.id DESC
  LIMIT 1;
$$;

ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID) TO authenticated, service_role;

-- Materializa somente configurações ausentes. Valores definidos no admin,
-- inclusive zero, são preservados pelo ON CONFLICT DO NOTHING.
INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, defaults.plan_code, defaults.feature_code, defaults.max_limit
FROM public.tenants t
CROSS JOIN (VALUES
  ('bronze', 'services_limit', 2), ('bronze', 'gallery_photos_limit', 1),
  ('bronze', 'benefits_limit', 0), ('bronze', 'events_limit', 0),
  ('bronze', 'posts_limit', 0), ('bronze', 'business_video_limit', 0),
  ('prata', 'services_limit', 5), ('prata', 'gallery_photos_limit', 6),
  ('prata', 'benefits_limit', 3), ('prata', 'events_limit', 2),
  ('prata', 'posts_limit', 2), ('prata', 'business_video_limit', 0),
  ('ouro', 'services_limit', 10), ('ouro', 'gallery_photos_limit', 10),
  ('ouro', 'benefits_limit', 5), ('ouro', 'events_limit', 10),
  ('ouro', 'posts_limit', 10), ('ouro', 'business_video_limit', 1)
) AS defaults(plan_code, feature_code, max_limit)
ON CONFLICT (tenant_id, plan_code, feature_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public._get_plan_entitlement(
  p_tenant_id UUID,
  p_plan_code TEXT,
  p_feature_code TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_limit INTEGER;
  v_plan_code TEXT := LOWER(COALESCE(p_plan_code, ''));
BEGIN
  IF v_plan_code IN ('ouro_founder', 'acacia', 'acácia', 'gold') THEN v_plan_code := 'ouro'; END IF;
  IF v_plan_code IN ('compasso', 'silver') THEN v_plan_code := 'prata'; END IF;
  IF v_plan_code IN ('esquadro') THEN v_plan_code := 'bronze'; END IF;

  SELECT pe.max_limit INTO v_limit
  FROM public.plan_entitlements pe
  WHERE pe.tenant_id = p_tenant_id
    AND LOWER(pe.plan_code) = v_plan_code
    AND LOWER(pe.feature_code) = LOWER(p_feature_code);

  IF v_limit IS NOT NULL THEN RETURN v_limit; END IF;

  RETURN CASE v_plan_code
    WHEN 'ouro' THEN CASE LOWER(p_feature_code)
      WHEN 'services_limit' THEN 10 WHEN 'gallery_photos_limit' THEN 10
      WHEN 'benefits_limit' THEN 5 WHEN 'events_limit' THEN 10
      WHEN 'posts_limit' THEN 10 WHEN 'business_video_limit' THEN 1 ELSE 0 END
    WHEN 'prata' THEN CASE LOWER(p_feature_code)
      WHEN 'services_limit' THEN 5 WHEN 'gallery_photos_limit' THEN 6
      WHEN 'benefits_limit' THEN 3 WHEN 'events_limit' THEN 2
      WHEN 'posts_limit' THEN 2 ELSE 0 END
    WHEN 'bronze' THEN CASE LOWER(p_feature_code)
      WHEN 'services_limit' THEN 2 WHEN 'gallery_photos_limit' THEN 1 ELSE 0 END
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION public._get_plan_entitlement(UUID, TEXT, TEXT) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
