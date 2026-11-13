-- ROLLBACK da migration 231 (eventos financeiros e captura em invoices).
-- Fora de supabase/migrations de propósito. Dados financeiros capturados NUNCA são apagados.
-- O trigger em public.invoices é removido PRIMEIRO, restaurando o comportamento original.

DROP TRIGGER IF EXISTS trg_commercial_invoice_capture ON public.invoices;

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_financial_events', 'commercial_capture_failures']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'Rollback 231 recusado: public.% possui % linha(s). Arquive antes de reverter (o trigger em invoices já foi removido nesta transação e será desfeito pelo erro).', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

DROP VIEW IF EXISTS public.commercial_capture_gaps;
DROP FUNCTION IF EXISTS public.commercial_reconcile_capture(UUID, INT);
DROP FUNCTION IF EXISTS public.commercial_trg_invoice_capture();
DROP FUNCTION IF EXISTS public.commercial_capture_invoice(public.invoices);
DROP FUNCTION IF EXISTS public.commercial_settled_cents(TEXT, NUMERIC);
DROP TABLE IF EXISTS public.commercial_capture_failures;
DROP TABLE IF EXISTS public.commercial_financial_events;

NOTIFY pgrst, 'reload schema';
