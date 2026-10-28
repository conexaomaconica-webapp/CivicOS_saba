-- ============================================================================
-- Rollback Migration 217: Conexão Maçônica - Taxonomias de Origem e Descoberta
-- ============================================================================
-- Reverte a adição de índices e colunas dedicadas de forma 100% segura,
-- preservando integralmente todos os metadados JSONB históricos.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_analytics_events_discovery_source;
DROP INDEX IF EXISTS public.idx_analytics_events_acquisition_source;

ALTER TABLE public.analytics_events
  DROP COLUMN IF EXISTS discovery_source,
  DROP COLUMN IF EXISTS acquisition_source;
