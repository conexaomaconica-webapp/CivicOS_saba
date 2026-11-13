-- ROLLBACK da migration 229 (leads, evidências e atribuições). Fora de supabase/migrations de propósito.
-- Atribuições e evidências sustentam comissões: nunca apagadas se existirem.
-- Leads/atividades sem atribuição podem ser descartados com:
--   SET commercial.allow_destructive_rollback = 'on';

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_attributions', 'commercial_referral_evidence']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'Rollback 229 recusado: public.% possui % linha(s) (base de comissões).', t, n;
      END IF;
    END IF;
  END LOOP;

  IF coalesce(current_setting('commercial.allow_destructive_rollback', true), 'off') <> 'on' THEN
    FOREACH t IN ARRAY ARRAY['commercial_lead_activities', 'commercial_leads']
    LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
        IF n > 0 THEN
          RAISE EXCEPTION 'Rollback 229 recusado: public.% possui % linha(s). Use SET commercial.allow_destructive_rollback = ''on'' para descartar.', t, n;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.commercial_attributions;
DROP TABLE IF EXISTS public.commercial_referral_evidence;
DROP TABLE IF EXISTS public.commercial_lead_activities;
DROP TABLE IF EXISTS public.commercial_leads;
DROP FUNCTION IF EXISTS public.commercial_guard_attribution_update();
DROP FUNCTION IF EXISTS public.commercial_guard_evidence_update();

NOTIFY pgrst, 'reload schema';
