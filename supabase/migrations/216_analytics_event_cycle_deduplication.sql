-- ============================================================================
-- Migration 216: Conexão Maçônica - Diagnóstico e Auditoria de Idempotência por Ciclo
-- ============================================================================
-- Audita e diagnostica idempotência de visualizações de perfil (event_name = 'view')
-- por ciclo de navegação efêmero (cycle_id) de forma 100% NÃO-DESTRUTIVA, preservando
-- integralmente todo o histórico de dados e evidências para auditoria técnica.
--
-- AVISO OBRIGATÓRIO:
-- Arquivo gerado para homologação em ambiente de desenvolvimento local.
-- NÃO EXECUTAR EM PRODUÇÃO / STAGING SEM AUTORIZAÇÃO EXPLÍCITA DO COMITÊ TÉCNICO.
-- ============================================================================

-- 1. View Diagnóstica Não-Destrutiva: Identifica duplicatas exatas por chave de idempotência
CREATE OR REPLACE VIEW public.vw_audit_duplicate_view_cycles AS
WITH ranked_cycles AS (
  SELECT
    id,
    business_id,
    metadata->>'cycle_id' AS cycle_id,
    created_at,
    COUNT(*) OVER (PARTITION BY business_id, metadata->>'cycle_id') AS occurrences,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, metadata->>'cycle_id'
      ORDER BY created_at ASC, id ASC
    ) AS r_num
  FROM public.analytics_events
  WHERE event_name = 'view'
    AND metadata->>'cycle_id' IS NOT NULL
)
SELECT
  business_id,
  cycle_id,
  occurrences AS total_duplicates,
  MIN(created_at) AS first_event_at,
  MAX(created_at) AS last_event_at,
  ARRAY_AGG(id ORDER BY created_at ASC) AS all_event_ids
FROM ranked_cycles
WHERE occurrences > 1
GROUP BY business_id, cycle_id, occurrences;

COMMENT ON VIEW public.vw_audit_duplicate_view_cycles IS
'Diagnóstico não-destrutivo para auditoria de eventos com cycle_id repetido, sem alteração de dados históricos.';

-- 2. Índice B-Tree de alta performance para aceleração da chave de idempotência
CREATE INDEX IF NOT EXISTS idx_analytics_events_view_cycle
ON public.analytics_events (business_id, (metadata->>'cycle_id'))
WHERE event_name = 'view' AND metadata->>'cycle_id' IS NOT NULL;

COMMENT ON INDEX public.idx_analytics_events_view_cycle IS
'Índice B-tree parcial para consulta e verificação de concorrência em visualizações por ciclo de navegação efêmero.';

-- 3. Índice ÚNICO PARCIAL para garantia física de idempotência no PostgreSQL
-- Aplica-se exclusivamente a novos eventos (created_at >= '2026-10-28 00:00:00+00'),
-- garantindo integridade ACID física sob concorrência distribuída sem quebrar pelo histórico anterior.
CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_events_view_cycle_forward
ON public.analytics_events (business_id, (metadata->>'cycle_id'))
WHERE event_name = 'view'
  AND metadata->>'cycle_id' IS NOT NULL
  AND created_at >= '2026-10-28 00:00:00+00';

COMMENT ON INDEX public.uq_analytics_events_view_cycle_forward IS
'Garante unicidade física contra condições de corrida distribuídas para eventos gerados a partir do corte de homologação.';

-- 4. Função e Gatilho (Trigger) para descarte atômico e silencioso de ciclos concorrentes
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view_cycle()
RETURNS trigger AS $$
BEGIN
  IF NEW.event_name = 'view' AND NEW.metadata->>'cycle_id' IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.analytics_events
      WHERE business_id = NEW.business_id
        AND event_name = 'view'
        AND metadata->>'cycle_id' = NEW.metadata->>'cycle_id'
        AND created_at >= '2026-10-28 00:00:00+00'
    ) THEN
      -- Aborta a inserção da linha duplicada de forma atômica no motor PostgreSQL sem lançar erro de transação
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

COMMENT ON FUNCTION public.fn_prevent_duplicate_view_cycle IS
'Descarta atômica e silenciosamente inserções concorrentes com mesmo cycle_id para a mesma empresa a partir da data de corte.';

