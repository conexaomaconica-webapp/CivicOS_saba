-- ROLLBACK da migration 238 (operações atômicas de leads/atribuições). Fora de supabase/migrations de propósito.
-- Remove apenas as funções. Os tipos de evidência ampliados só voltam ao conjunto anterior se nenhuma
-- evidência usar os tipos novos (senão recusa, para não perder a origem de indicações).

DO $$
DECLARE
  n BIGINT;
BEGIN
  IF to_regclass('public.commercial_referral_evidence') IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.commercial_referral_evidence
    WHERE evidence_type IN ('representative_registration', 'lead_conversion');
    IF n > 0 THEN
      RAISE EXCEPTION 'Rollback 238 recusado: % evidência(s) usam os tipos novos (origem de indicações).', n;
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_expire_stale(UUID);
DROP FUNCTION IF EXISTS public.commercial_register_lead(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.commercial_confirm_attribution(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_convert_lead(UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_qualify_lead(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.commercial_log_lead_activity(UUID, UUID, TEXT, UUID, TEXT);

DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.commercial_referral_evidence'::regclass
      AND con.contype = 'c' AND pg_get_constraintdef(con.oid) LIKE '%evidence_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.commercial_referral_evidence DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.commercial_referral_evidence
  ADD CONSTRAINT commercial_referral_evidence_evidence_type_check
  CHECK (evidence_type IN (
    'referral_link_visit', 'signup_invite', 'signup_form_submission', 'landing_form', 'admin_registration', 'document'
  ));

NOTIFY pgrst, 'reload schema';
