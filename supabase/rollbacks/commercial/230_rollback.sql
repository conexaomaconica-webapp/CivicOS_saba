-- ROLLBACK da migration 230 (regras de comissão). Fora de supabase/migrations de propósito.
-- Regras ativas/encerradas são histórico financeiro (referenciadas por snapshots): nunca apagadas.
-- Rascunhos podem ser apagados com: SET commercial.allow_destructive_rollback = 'on';

DO $$
DECLARE
  n_hist BIGINT;
  n_draft BIGINT;
BEGIN
  IF to_regclass('public.commercial_commission_rules') IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE status <> 'draft'), count(*) FILTER (WHERE status = 'draft')
      INTO n_hist, n_draft FROM public.commercial_commission_rules;
    IF n_hist > 0 THEN
      RAISE EXCEPTION 'Rollback 230 recusado: % regra(s) ativa(s)/encerrada(s) existem (histórico financeiro).', n_hist;
    END IF;
    IF n_draft > 0 AND coalesce(current_setting('commercial.allow_destructive_rollback', true), 'off') <> 'on' THEN
      RAISE EXCEPTION 'Rollback 230 recusado: % rascunho(s) existem. Use SET commercial.allow_destructive_rollback = ''on'' para descartá-los.', n_draft;
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS public.commercial_commission_rules;
DROP FUNCTION IF EXISTS public.commercial_guard_rule_update();
DROP FUNCTION IF EXISTS public.commercial_guard_rule_delete();

NOTIFY pgrst, 'reload schema';
