-- ROLLBACK da migration 235 (RLS por papel e concessões de leitura a 'authenticated').
-- Fora de supabase/migrations de propósito. Não apaga dados: apenas remove políticas e concessões,
-- devolvendo o estado do Gate 1A (somente service_role). Execute depois do rollback 236.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_settings', 'commercial_access_grants', 'commercial_representative_documents',
    'commercial_leads', 'commercial_lead_activities', 'commercial_referral_evidence', 'commercial_attributions',
    'commercial_commission_rules', 'commercial_financial_events', 'commercial_capture_failures',
    'commercial_closing_periods', 'commercial_payouts', 'commercial_ledger_entries',
    'commercial_commission_releases', 'commercial_payout_items', 'commercial_representatives'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.commercial_representative_balances') IS NOT NULL THEN
    REVOKE ALL ON public.commercial_representative_balances FROM authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
