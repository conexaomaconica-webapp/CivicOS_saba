-- ============================================================================
-- Rollback da Migration 258: Unificação e Sincronização Canônica das Visualizações
-- ============================================================================
-- Estratégia segura de reversão (Seção 5 do GATE-BUSINESS-VIEWS):
--   1. NUNCA apaga eventos históricos de `public.analytics_events`.
--   2. NUNCA remove a coluna `public.businesses.views_count` enquanto consumidores
--      puderem lê-la; mantém os valores reconciliados intactos.
--   3. Restaura a função `fn_prevent_duplicate_view_cycle` original da Migration 216
--      (deduplicação pura por `cycle_id`).
--   4. Restaura o trigger `trg_businesses_updated_at` original.
--   5. Remove apenas o trigger incremental `trg_sync_business_views_count` caso seja
--      necessário desativar a sincronização automática, mantendo `reconcile_business_views_count`
--      disponível para ressincronização imediata pós-rollback.
-- ============================================================================

-- 1. Remove o trigger incremental de `analytics_events` (mantendo a função de reconciliação disponível)
DROP TRIGGER IF EXISTS trg_sync_business_views_count ON public.analytics_events;

-- 2. Restaura a função `fn_prevent_duplicate_view_cycle` para o comportamento exato da Migration 216
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
RETURNS TRIGGER AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  IF NEW.event_name = 'view'
     AND NEW.metadata->>'cycle_id' IS NOT NULL
     AND COALESCE(NEW.created_at, now()) >= '2026-10-28 00:00:00+00' THEN
    v_lock_key := ('x' || substr(md5(NEW.business_id::text || ':' || (NEW.metadata->>'cycle_id')), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    IF EXISTS (
      SELECT 1 FROM public.analytics_events
      WHERE business_id = NEW.business_id
        AND event_name = 'view'
        AND metadata->>'cycle_id' = NEW.metadata->>'cycle_id'
        AND created_at >= '2026-10-28 00:00:00+00'
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_view_cycle ON public.analytics_events;
CREATE TRIGGER trg_prevent_duplicate_view_cycle
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_duplicate_view_cycle();

-- 3. Remove o trigger de guarda de `views_count` em `businesses`
DROP TRIGGER IF EXISTS trg_guard_business_views_count ON public.businesses;
DROP FUNCTION IF EXISTS public.guard_business_views_count();

-- 4. Executa uma reconciliação final para garantir que `businesses.views_count` não fique desatualizado no momento do rollback
SELECT public.reconcile_business_views_count(NULL);

NOTIFY pgrst, 'reload schema';

