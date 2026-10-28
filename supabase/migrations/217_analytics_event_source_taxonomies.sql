-- ============================================================================
-- Migration 217: Conexão Maçônica - Taxonomias de Origem de Aquisição e Descoberta
-- ============================================================================
-- Adiciona colunas canônicas dedicadas para 'acquisition_source' e 'discovery_source'
-- na tabela 'analytics_events', permitindo consultas agregadas diretas e alta
-- performance em relatórios do anunciante sem sobrecarga de parse JSON em massa.
--
-- AVISO OBRIGATÓRIO:
-- Arquivo gerado para homologação em ambiente de desenvolvimento local.
-- NÃO EXECUTAR EM PRODUÇÃO / STAGING SEM AUTORIZAÇÃO EXPLÍCITA DO COMITÊ TÉCNICO.
-- ============================================================================

-- 1. Adição segura das novas colunas de taxonomia com fallback 'unidentified'
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT NOT NULL DEFAULT 'unidentified',
  ADD COLUMN IF NOT EXISTS discovery_source TEXT NOT NULL DEFAULT 'unidentified';

-- 2. Retrocompatibilidade: preenchimento gradual a partir de metadata existente se presente
UPDATE public.analytics_events
SET
  acquisition_source = COALESCE(metadata->>'acquisition_source', acquisition_source),
  discovery_source = COALESCE(metadata->>'discovery_source', discovery_source)
WHERE metadata ? 'acquisition_source' OR metadata ? 'discovery_source';

-- 3. Índices parciais para otimizar agregações de tráfego com estrito isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_analytics_events_acquisition_source
ON public.analytics_events (tenant_id, business_id, acquisition_source, created_at)
WHERE acquisition_source <> 'unidentified';

CREATE INDEX IF NOT EXISTS idx_analytics_events_discovery_source
ON public.analytics_events (tenant_id, business_id, discovery_source, created_at)
WHERE discovery_source <> 'unidentified';

COMMENT ON COLUMN public.analytics_events.acquisition_source IS
'Origem canônica de aquisição na plataforma (direct, organic_search, social, campaign, qr_code, external_referral, unidentified).';

COMMENT ON COLUMN public.analytics_events.discovery_source IS
'Origem canônica de descoberta interna da empresa no Guia (text_search, category, map, featured_sponsored, feed_wall, benefits_club, lodges_guide, direct_link, unidentified).';
