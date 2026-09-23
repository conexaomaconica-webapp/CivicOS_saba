-- Garante a cota canônica de vídeo institucional para o Plano Acácia/Ouro.
-- O fallback no trigger evita bloqueio indevido quando um tenant antigo ainda
-- não possui a linha de entitlement materializada.
INSERT INTO public.plan_entitlements (tenant_id, plan_code, feature_code, max_limit)
SELECT t.id, p.plan_code, 'business_video_limit', p.max_limit
FROM public.tenants t
CROSS JOIN (VALUES
  ('esquadro', 0),
  ('compasso', 0),
  ('ouro', 1),
  ('acacia', 1)
) AS p(plan_code, max_limit)
ON CONFLICT (tenant_id, plan_code, feature_code)
DO UPDATE SET
  max_limit = EXCLUDED.max_limit,
  updated_at = NOW();

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
  IF NEW.media_type <> 'video' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ep.plan_code, b.plan_tier, 'esquadro')
  INTO v_plan_code
  FROM public.businesses b
  LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id) ep ON TRUE
  WHERE b.id = NEW.business_id
    AND b.tenant_id = NEW.tenant_id;

  SELECT pe.max_limit
  INTO v_limit
  FROM public.plan_entitlements pe
  WHERE pe.tenant_id = NEW.tenant_id
    AND pe.plan_code = v_plan_code
    AND pe.feature_code = 'business_video_limit';

  v_limit := COALESCE(
    v_limit,
    CASE
      WHEN LOWER(COALESCE(v_plan_code, '')) IN ('ouro', 'acacia') THEN 1
      ELSE 0
    END
  );

  SELECT count(*)
  INTO v_used
  FROM public.business_media bm
  WHERE bm.tenant_id = NEW.tenant_id
    AND bm.business_id = NEW.business_id
    AND bm.media_type = 'video'
    AND bm.id IS DISTINCT FROM NEW.id;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Video excedido para plan %', v_plan_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_business_video_quota ON public.business_media;
CREATE TRIGGER check_business_video_quota
  BEFORE INSERT OR UPDATE ON public.business_media
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_business_video_quota();
