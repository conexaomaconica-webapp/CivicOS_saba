-- 182 - Resgate de benefício alimenta o funil (analytics_events).
--
-- O motor de resgate (086-088) já existe. Aqui só emitimos os eventos canônicos:
--   benefit_claim    = membro gerou o código (status 'redeemed')
--   benefit_redeemed = empresa validou o uso (status 'used')
-- Não altera o motor; falha de telemetria nunca bloqueia o resgate. Depende da 178 (ref_type/ref_id/source).

CREATE OR REPLACE FUNCTION public.trg_benefit_redemption_to_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event TEXT;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      v_event := 'benefit_claim';
    ELSIF NEW.status = 'used' AND OLD.status IS DISTINCT FROM 'used' THEN
      v_event := 'benefit_redeemed';
    END IF;

    IF v_event IS NOT NULL THEN
      INSERT INTO public.analytics_events
        (tenant_id, business_id, event_name, source, ref_type, ref_id, metadata)
      VALUES
        (NEW.tenant_id, NEW.business_id, v_event, 'oferta', 'benefit_redemption', NEW.id,
         jsonb_build_object('benefit_id', NEW.benefit_id));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_benefit_redemption_to_analytics() FROM PUBLIC, anon, authenticated;

DO $do$
BEGIN
  IF to_regclass('public.business_benefit_redemptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_benefit_redemptions_analytics ON public.business_benefit_redemptions;
    CREATE TRIGGER trg_benefit_redemptions_analytics
      AFTER INSERT OR UPDATE OF status ON public.business_benefit_redemptions
      FOR EACH ROW EXECUTE FUNCTION public.trg_benefit_redemption_to_analytics();
  ELSE
    RAISE NOTICE 'business_benefit_redemptions não existe: aplique 086-088 e reexecute a 182.';
  END IF;
END
$do$;
