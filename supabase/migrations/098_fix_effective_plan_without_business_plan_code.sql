-- Removes the obsolete businesses.plan_code dependency from quota checks.
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
    JOIN public.plans p ON p.id = pv.plan_id
    WHERE s.tenant_id = p_tenant_id
      AND s.business_id = p_business_id
      AND (
        (s.status IN ('active', 'trialing')
          AND statement_timestamp() >= COALESCE(s.current_period_start, '1970-01-01'::timestamptz)
          AND (s.current_period_end IS NULL OR statement_timestamp() < s.current_period_end))
        OR
        (s.status = 'past_due' AND s.grace_until IS NOT NULL
          AND statement_timestamp() < s.grace_until)
        OR
        (s.status = 'canceled' AND s.access_ends_at IS NOT NULL
          AND statement_timestamp() < s.access_ends_at)
      )
  ), unique_candidate AS (
    SELECT e.* FROM eligible e WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT
    c.subscription_id,
    c.plan_version_id,
    c.plan_code,
    c.subscription_status,
    c.access_valid_until,
    c.is_in_grace,
    '{}'::jsonb AS entitlements
  FROM unique_candidate c;
$$;

ALTER FUNCTION public._effective_business_plan(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._effective_business_plan(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._effective_business_plan(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_check_business_video_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_code TEXT;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  IF NEW.media_type <> 'video' THEN RETURN NEW; END IF;

  SELECT COALESCE(ep.plan_code, b.plan_tier, 'bronze')
  INTO v_plan_code
  FROM public.businesses b
  LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id) ep ON TRUE
  WHERE b.id = NEW.business_id AND b.tenant_id = NEW.tenant_id;

  SELECT pe.max_limit INTO v_limit
  FROM public.plan_entitlements pe
  WHERE pe.tenant_id = NEW.tenant_id
    AND pe.plan_code = v_plan_code
    AND pe.feature_code = 'business_video_limit';

  SELECT count(*) INTO v_used
  FROM public.business_media bm
  WHERE bm.tenant_id = NEW.tenant_id
    AND bm.business_id = NEW.business_id
    AND bm.media_type = 'video'
    AND bm.id IS DISTINCT FROM NEW.id;

  IF COALESCE(v_limit, 0) <= v_used THEN
    RAISE EXCEPTION 'Video quota exceeded for plan %', v_plan_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_business_video_quota ON public.business_media;
CREATE TRIGGER check_business_video_quota
  BEFORE INSERT OR UPDATE ON public.business_media
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_business_video_quota();
