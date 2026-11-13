-- ROLLBACK da migration 232 (livro-razão, liberações, repasses, fechamento).
-- NÃO é uma migration: fica fora de supabase/migrations para nunca rodar em db reset/push.
-- SEGURANÇA: tabelas financeiras com dados NUNCA são apagadas (nem com a chave de override).
-- Arquive os dados manualmente antes, se for realmente necessário reverter.

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_payout_items', 'commercial_commission_releases', 'commercial_ledger_entries',
    'commercial_payouts', 'commercial_closing_periods'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'Rollback 232 recusado: public.% possui % linha(s) financeiras. Arquive antes de reverter.', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

DROP VIEW IF EXISTS public.commercial_representative_balances;
DROP TABLE IF EXISTS public.commercial_payout_items;
DROP TABLE IF EXISTS public.commercial_commission_releases;
-- O trigger BEFORE TRUNCATE não impede DROP TABLE; a guarda de dados acima é a proteção.
DROP TABLE IF EXISTS public.commercial_ledger_entries;
DROP TABLE IF EXISTS public.commercial_payouts;
DROP TABLE IF EXISTS public.commercial_closing_periods;
DROP FUNCTION IF EXISTS public.commercial_ledger_block_mutation();

NOTIFY pgrst, 'reload schema';
