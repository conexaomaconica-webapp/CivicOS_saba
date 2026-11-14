-- ROLLBACK da migration 242 (estornos/chargebacks do provedor). Fora de supabase/migrations de propósito.
-- Recusa se existir evento financeiro de origem 'provider_webhook': apagar o índice/função não remove os eventos,
-- mas o histórico de estornos não pode ficar sem a regra que o gerou.
DO $$
DECLARE
  n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM public.commercial_financial_events WHERE source_kind = 'provider_webhook';
  IF n > 0 THEN
    RAISE EXCEPTION 'Rollback 242 recusado: % evento(s) de estorno/chargeback do provedor registrados.', n;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_record_provider_reversal(UUID, UUID, TEXT, BIGINT, BOOLEAN, TIMESTAMPTZ, TEXT, JSONB);
DROP INDEX IF EXISTS public.uq_commercial_events_provider_seq;
