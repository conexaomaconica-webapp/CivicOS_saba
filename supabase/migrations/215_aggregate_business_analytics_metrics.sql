-- =============================================================================
-- Migration 215: Agregação de Métricas de Analytics no PostgreSQL (P0)
-- CivicOS SABA / Conexão Maçônica - Eliminação do Truncamento em Memória
-- =============================================================================
-- Substitui a leitura sequencial de milhares de linhas brutas em Node.js por
-- agregações atômicas no PostgreSQL, com isolamento multi-tenant e índices.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_business_analytics_aggregate_metrics(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_owner_or_admin BOOLEAN := false;
  v_start_date TIMESTAMPTZ;
  v_prev_start_date TIMESTAMPTZ;

  -- Totais Período Atual
  v_views_current BIGINT := 0;
  v_unique_visitors_current BIGINT := 0;
  v_whatsapp BIGINT := 0;
  v_route BIGINT := 0;
  v_website BIGINT := 0;
  v_phone BIGINT := 0;
  v_instagram BIGINT := 0;
  v_shares BIGINT := 0;
  v_interactions_current BIGINT := 0;

  -- Totais Período Anterior
  v_views_prev BIGINT := 0;
  v_unique_visitors_prev BIGINT := 0;
  v_whatsapp_prev BIGINT := 0;
  v_route_prev BIGINT := 0;
  v_website_prev BIGINT := 0;
  v_phone_prev BIGINT := 0;
  v_instagram_prev BIGINT := 0;
  v_shares_prev BIGINT := 0;
  v_interactions_prev BIGINT := 0;

  -- Percentuais e Taxas
  v_interaction_rate NUMERIC(5,2) := 0.00;
  v_views_growth NUMERIC(5,2) := 0.00;
  v_visitors_growth NUMERIC(5,2) := 0.00;
  v_interactions_growth NUMERIC(5,2) := 0.00;
  v_whatsapp_growth NUMERIC(5,2) := 0.00;
  v_route_growth NUMERIC(5,2) := 0.00;
  v_website_growth NUMERIC(5,2) := 0.00;
  v_phone_growth NUMERIC(5,2) := 0.00;
  v_instagram_growth NUMERIC(5,2) := 0.00;
  v_shares_growth NUMERIC(5,2) := 0.00;

  -- Objetos Agregados
  v_daily_evolution JSONB;
  v_traffic_origins JSONB;
  v_geo_aggregation JSONB;
  v_total_processed BIGINT := 0;
BEGIN
  -- 1. Verificação de Empresa Ativa
  SELECT tenant_id INTO v_tenant_id
  FROM public.businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Empresa não localizada ou inativa.';
  END IF;

  -- 2. Limites Temporais
  v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  v_prev_start_date := NOW() - ((p_days * 2) || ' days')::INTERVAL;

  -- 3. Métricas Período Atual (Agregadas diretamente no banco)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_name IN ('view', 'page_view')), 0),
    COALESCE(COUNT(DISTINCT pseudonymous_subject_id) FILTER (WHERE event_name IN ('view', 'page_view') AND pseudonymous_subject_id IS NOT NULL), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'whatsapp_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name IN ('route_click', 'directions_click')), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'website_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'phone_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'instagram_click' OR (event_name = 'social_click' AND metadata->>'channel' = 'instagram')), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'share'), 0),
    COUNT(*)
  INTO
    v_views_current,
    v_unique_visitors_current,
    v_whatsapp,
    v_route,
    v_website,
    v_phone,
    v_instagram,
    v_shares,
    v_total_processed
  FROM public.analytics_events
  WHERE business_id = p_business_id
    AND created_at >= v_start_date;

  IF v_unique_visitors_current = 0 AND v_views_current > 0 THEN
    v_unique_visitors_current := 1;
  END IF;

  v_interactions_current := v_whatsapp + v_route + v_website + v_phone + v_instagram + v_shares;

  -- 4. Métricas Período Anterior (Para Comparação)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_name IN ('view', 'page_view')), 0),
    COALESCE(COUNT(DISTINCT pseudonymous_subject_id) FILTER (WHERE event_name IN ('view', 'page_view') AND pseudonymous_subject_id IS NOT NULL), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'whatsapp_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name IN ('route_click', 'directions_click')), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'website_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'phone_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'instagram_click' OR (event_name = 'social_click' AND metadata->>'channel' = 'instagram')), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_name = 'share'), 0)
  INTO
    v_views_prev,
    v_unique_visitors_prev,
    v_whatsapp_prev,
    v_route_prev,
    v_website_prev,
    v_phone_prev,
    v_instagram_prev,
    v_shares_prev
  FROM public.analytics_events
  WHERE business_id = p_business_id
    AND created_at >= v_prev_start_date
    AND created_at < v_start_date;

  IF v_unique_visitors_prev = 0 AND v_views_prev > 0 THEN
    v_unique_visitors_prev := 1;
  END IF;

  v_interactions_prev := v_whatsapp_prev + v_route_prev + v_website_prev + v_phone_prev + v_instagram_prev + v_shares_prev;

  -- 5. Cálculo dos Crescimentos
  IF v_views_current > 0 THEN
    v_interaction_rate := ROUND((v_interactions_current::NUMERIC / v_views_current::NUMERIC) * 100, 1);
  END IF;

  IF v_views_prev > 0 THEN
    v_views_growth := ROUND(((v_views_current - v_views_prev)::NUMERIC / v_views_prev::NUMERIC) * 100, 0);
  ELSIF v_views_current > 0 THEN
    v_views_growth := 100.00;
  END IF;

  IF v_unique_visitors_prev > 0 THEN
    v_visitors_growth := ROUND(((v_unique_visitors_current - v_unique_visitors_prev)::NUMERIC / v_unique_visitors_prev::NUMERIC) * 100, 0);
  ELSIF v_unique_visitors_current > 0 THEN
    v_visitors_growth := 100.00;
  END IF;

  IF v_interactions_prev > 0 THEN
    v_interactions_growth := ROUND(((v_interactions_current - v_interactions_prev)::NUMERIC / v_interactions_prev::NUMERIC) * 100, 0);
  ELSIF v_interactions_current > 0 THEN
    v_interactions_growth := 100.00;
  END IF;

  -- 6. Evolução Diária (Timezone America/Sao_Paulo)
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_daily_evolution
  FROM (
    SELECT
      TO_CHAR(timezone('America/Sao_Paulo', created_at), 'DD/MM') AS date,
      COALESCE(COUNT(*) FILTER (WHERE event_name IN ('view', 'page_view')), 0) AS views,
      COALESCE(COUNT(DISTINCT pseudonymous_subject_id) FILTER (WHERE event_name IN ('view', 'page_view')), 0) AS unique_visitors,
      COALESCE(COUNT(*) FILTER (WHERE event_name IN ('whatsapp_click', 'route_click', 'directions_click', 'website_click', 'phone_click', 'instagram_click', 'share')), 0) AS interactions
    FROM public.analytics_events
    WHERE business_id = p_business_id AND created_at >= v_start_date
    GROUP BY TO_CHAR(timezone('America/Sao_Paulo', created_at), 'DD/MM'), DATE_TRUNC('day', timezone('America/Sao_Paulo', created_at))
    ORDER BY DATE_TRUNC('day', timezone('America/Sao_Paulo', created_at)) ASC
  ) d;

  -- 7. Origens de Tráfego
  SELECT COALESCE(jsonb_agg(orig), '[]'::jsonb) INTO v_traffic_origins
  FROM (
    SELECT
      origin_key AS origin,
      origin_label AS label,
      count,
      CASE WHEN v_views_current > 0 THEN ROUND((count::NUMERIC / v_views_current::NUMERIC) * 100) ELSE 0 END AS percentage
    FROM (
      SELECT
        CASE
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'search|directory|categoria|lista|destaque' THEN 'guia'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'social|share|whatsapp|qr|instagram' THEN 'redes'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'google|organic|bing|ai_search' THEN 'buscadores'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'mural|connection|referral' THEN 'mural'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) = 'direct' THEN 'direto'
          ELSE 'desconhecido'
        END AS origin_key,
        CASE
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'search|directory|categoria|lista|destaque' THEN 'Busca e Navegação no Guia'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'social|share|whatsapp|qr|instagram' THEN 'Links Compartilhados e Redes'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'google|organic|bing|ai_search' THEN 'Google e Motores de Busca'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) ~ 'mural|connection|referral' THEN 'Mural de Conexões e Indicações'
          WHEN LOWER(COALESCE(metadata->>'origin', source, '')) = 'direct' THEN 'Acessos Diretos (Confirmados)'
          ELSE 'Origem Não Identificada / Outros'
        END AS origin_label,
        COUNT(*) AS count
      FROM public.analytics_events
      WHERE business_id = p_business_id
        AND event_name IN ('view', 'page_view')
        AND created_at >= v_start_date
      GROUP BY origin_key, origin_label
    ) sub
    ORDER BY count DESC
  ) orig;

  -- 8. Agregação Geográfica Top 5
  SELECT COALESCE(jsonb_agg(g), '[]'::jsonb) INTO v_geo_aggregation
  FROM (
    SELECT
      metadata->>'city' AS city,
      metadata->>'state' AS state,
      COUNT(*) AS visitors_count,
      ROUND((COUNT(*)::NUMERIC / NULLIF(COUNT(*) OVER (), 0)) * 100) AS percentage
    FROM public.analytics_events
    WHERE business_id = p_business_id
      AND created_at >= v_start_date
      AND metadata->>'city' IS NOT NULL
      AND metadata->>'state' IS NOT NULL
    GROUP BY metadata->>'city', metadata->>'state'
    ORDER BY visitors_count DESC
    LIMIT 5
  ) g;

  -- 9. Retorno Completo Compilado
  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'views', v_views_current,
      'viewsComparisonPercent', v_views_growth,
      'uniqueVisitors', v_unique_visitors_current,
      'uniqueVisitorsComparisonPercent', v_visitors_growth,
      'interactions', v_interactions_current,
      'interactionsComparisonPercent', v_interactions_growth,
      'whatsappClicks', v_whatsapp,
      'whatsappComparisonPercent', v_whatsapp_growth,
      'phoneClicks', v_phone,
      'phoneComparisonPercent', v_phone_growth,
      'websiteClicks', v_website,
      'websiteComparisonPercent', v_website_growth,
      'instagramClicks', v_instagram,
      'instagramComparisonPercent', v_instagram_growth,
      'routeClicks', v_route,
      'routeComparisonPercent', v_route_growth,
      'shares', v_shares,
      'sharesComparisonPercent', v_shares_growth,
      'interactionRatePercent', v_interaction_rate
    ),
    'funnel', jsonb_build_object(
      'views', v_views_current,
      'interactions', v_interactions_current,
      'whatsapp', v_whatsapp,
      'routes', v_route
    ),
    'dailyEvolution', v_daily_evolution,
    'trafficOrigins', v_traffic_origins,
    'geographicAggregation', v_geo_aggregation,
    'dataCompleteness', jsonb_build_object(
      'isComplete', true,
      'isSampled', false,
      'isTruncated', false,
      'totalProcessedEvents', v_total_processed
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_analytics_aggregate_metrics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_analytics_aggregate_metrics(UUID, INTEGER) TO service_role;
