-- Migration 094: vídeo institucional por entitlement comercial.
INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, p.plan_code, 'business_video_limit', p.max_limit
FROM public.tenants t
CROSS JOIN (VALUES
  ('bronze', 0), ('prata', 0), ('ouro', 1), ('ouro_founder', 1)
) AS p(plan_code, max_limit)
ON CONFLICT (tenant_id, plan_code, feature_code)
DO UPDATE SET max_limit = EXCLUDED.max_limit, updated_at = NOW();

CREATE OR REPLACE FUNCTION public.trg_check_business_video_quota()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_plan_code TEXT; v_limit INTEGER; v_used INTEGER;
BEGIN
  IF NEW.media_type <> 'video' THEN RETURN NEW; END IF;
  SELECT COALESCE(s.plan_code, b.plan_code, b.plan_tier, 'bronze') INTO v_plan_code
  FROM public.businesses b
  LEFT JOIN LATERAL (
    SELECT p.code AS plan_code
    FROM public.subscriptions sub
    JOIN public.plan_versions pv ON pv.id = sub.plan_version_id
    JOIN public.plans p ON p.id = pv.plan_id
    WHERE sub.business_id = b.id AND sub.status = 'active'
    ORDER BY sub.created_at DESC LIMIT 1
  ) s ON TRUE
  WHERE b.id = NEW.business_id;
  SELECT COALESCE(max_limit, 0) INTO v_limit FROM public.plan_entitlements
  WHERE tenant_id = NEW.tenant_id AND plan_code = v_plan_code AND feature_code = 'business_video_limit';
  SELECT COUNT(*) INTO v_used FROM public.business_media
  WHERE business_id = NEW.business_id AND media_type = 'video' AND id IS DISTINCT FROM NEW.id;
  IF COALESCE(v_limit, 0) <= v_used THEN RAISE EXCEPTION 'Video quota exceeded for plan %', v_plan_code; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS check_business_video_quota ON public.business_media;
CREATE TRIGGER check_business_video_quota BEFORE INSERT OR UPDATE ON public.business_media FOR EACH ROW EXECUTE FUNCTION public.trg_check_business_video_quota();
