-- Migration 063: Advanced Advertiser Analytics Engine & Privacy Hardening

-- 1. Create/Evolve directory_analytics_events table
CREATE TABLE IF NOT EXISTS public.directory_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN ('view', 'whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'benefit_click', 'social_click', 'service_view')
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  city TEXT,
  state TEXT,
  geo_bucket TEXT,
  source TEXT DEFAULT 'direct',
  session_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_directory_analytics_biz_type
  ON public.directory_analytics_events (business_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_directory_analytics_dedup
  ON public.directory_analytics_events (business_id, event_type, session_hash, occurred_at DESC);

-- Enable RLS
ALTER TABLE public.directory_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS: Public cannot read raw analytics table; Owners & Admins can read
DROP POLICY IF EXISTS "Owners and admins read analytics" ON public.directory_analytics_events;
CREATE POLICY "Owners and admins read analytics"
  ON public.directory_analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = directory_analytics_events.business_id
        AND (b.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin')))
    )
  );

-- 2. RPC: Record Directory Analytics Event (Fast & Anti-Spam Deduplication)
CREATE OR REPLACE FUNCTION public.record_directory_analytics_event(
  p_business_id UUID,
  p_event_type VARCHAR(50),
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'direct',
  p_session_hash VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_dedup_window INTERVAL;
  v_recent_count INT := 0;
  v_geo_bucket TEXT;
BEGIN
  -- 1. Validate Business exists and is active
  SELECT tenant_id INTO v_tenant_id
  FROM public.businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'BUSINESS_NOT_FOUND_OR_INACTIVE');
  END IF;

  -- 2. Anti-inflation & Deduplicação por Janela
  IF p_event_type = 'view' THEN
    v_dedup_window := INTERVAL '30 minutes';
  ELSE
    v_dedup_window := INTERVAL '2 minutes';
  END IF;

  IF p_session_hash IS NOT NULL AND p_session_hash != '' THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.directory_analytics_events
    WHERE business_id = p_business_id
      AND event_type = p_event_type
      AND session_hash = p_session_hash
      AND occurred_at > (NOW() - v_dedup_window);

    IF v_recent_count > 0 THEN
      RETURN jsonb_build_object('ok', true, 'deduplicated', true);
    END IF;
  END IF;

  -- 3. Geo Bucket Agregado (Privacidade Preservada)
  IF p_city IS NOT NULL AND p_state IS NOT NULL THEN
    v_geo_bucket := UPPER(p_state) || '-' || UPPER(REGEXP_REPLACE(p_city, '\s+', '_', 'g'));
  ELSE
    v_geo_bucket := 'BRASIL-GERAL';
  END IF;

  -- 4. Inserção do Evento
  INSERT INTO public.directory_analytics_events (
    tenant_id,
    business_id,
    event_type,
    occurred_at,
    city,
    state,
    geo_bucket,
    source,
    session_hash
  )
  VALUES (
    v_tenant_id,
    p_business_id,
    p_event_type,
    NOW(),
    p_city,
    p_state,
    v_geo_bucket,
    COALESCE(p_source, 'direct'),
    p_session_hash
  );

  RETURN jsonb_build_object('ok', true, 'recorded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_directory_analytics_event(UUID, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.record_directory_analytics_event(UUID, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_directory_analytics_event(UUID, VARCHAR, TEXT, TEXT, TEXT, VARCHAR) TO service_role;

-- 3. RPC: Get Advertiser Analytics Summary (7 / 30 / 90 Days)
CREATE OR REPLACE FUNCTION public.get_advertiser_analytics_summary(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner_or_admin BOOLEAN := false;
  v_start_date TIMESTAMPTZ;
  v_prev_start_date TIMESTAMPTZ;
  v_views_current BIGINT := 0;
  v_views_prev BIGINT := 0;
  v_whatsapp BIGINT := 0;
  v_phone BIGINT := 0;
  v_website BIGINT := 0;
  v_directions BIGINT := 0;
  v_benefits BIGINT := 0;
  v_social BIGINT := 0;
  v_services BIGINT := 0;
  v_total_interactions BIGINT := 0;
  v_prev_interactions BIGINT := 0;
  v_interaction_rate NUMERIC(5,2) := 0.00;
  v_views_growth NUMERIC(5,2) := 0.00;
  v_interactions_growth NUMERIC(5,2) := 0.00;
  v_top_cities JSONB;
  v_aggregated_heatmap JSONB;
  v_daily_trends JSONB;
BEGIN
  -- 1. Ownership & Security Check
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND (
        b.owner_id = auth.uid()
        OR auth.uid() IS NULL -- Fallback para dev/service_role
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin'))
      )
  ) INTO v_is_owner_or_admin;

  IF NOT v_is_owner_or_admin THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Você não possui permissão para visualizar o analytics desta empresa.';
  END IF;

  v_start_date := NOW() - (p_days || ' days')::INTERVAL;
  v_prev_start_date := NOW() - ((p_days * 2) || ' days')::INTERVAL;

  -- 2. Métricas do Período Atual
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'whatsapp_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'phone_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'website_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'directions_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'benefit_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'social_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'service_view'), 0)
  INTO
    v_views_current, v_whatsapp, v_phone, v_website, v_directions, v_benefits, v_social, v_services
  FROM public.directory_analytics_events
  WHERE business_id = p_business_id AND occurred_at >= v_start_date;

  v_total_interactions := v_whatsapp + v_phone + v_website + v_directions + v_benefits + v_social;

  -- 3. Métricas do Período Anterior para Comparação
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type IN ('whatsapp_click', 'phone_click', 'website_click', 'directions_click', 'benefit_click', 'social_click')), 0)
  INTO
    v_views_prev, v_prev_interactions
  FROM public.directory_analytics_events
  WHERE business_id = p_business_id
    AND occurred_at >= v_prev_start_date
    AND occurred_at < v_start_date;

  -- 4. Cálculo de Taxa de Interação e Crescimento no Servidor
  IF v_views_current > 0 THEN
    v_interaction_rate := ROUND((v_total_interactions::NUMERIC / v_views_current::NUMERIC) * 100, 2);
  END IF;

  IF v_views_prev > 0 THEN
    v_views_growth := ROUND(((v_views_current - v_views_prev)::NUMERIC / v_views_prev::NUMERIC) * 100, 2);
  END IF;

  IF v_prev_interactions > 0 THEN
    v_interactions_growth := ROUND(((v_total_interactions - v_prev_interactions)::NUMERIC / v_prev_interactions::NUMERIC) * 100, 2);
  END IF;

  -- 5. Cidades Principais (Agregado)
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_top_cities
  FROM (
    SELECT COALESCE(city, 'Não informada') AS city, COUNT(*) AS total
    FROM public.directory_analytics_events
    WHERE business_id = p_business_id AND occurred_at >= v_start_date
    GROUP BY city
    ORDER BY total DESC
    LIMIT 5
  ) c;

  -- 6. Mapa de Calor Agregado por Cidade/Região (Privacidade Total)
  SELECT COALESCE(jsonb_agg(h), '[]'::jsonb) INTO v_aggregated_heatmap
  FROM (
    SELECT geo_bucket, COALESCE(city, 'Outras') AS city, COALESCE(state, 'SP') AS state, COUNT(*) AS intensity
    FROM public.directory_analytics_events
    WHERE business_id = p_business_id AND occurred_at >= v_start_date
    GROUP BY geo_bucket, city, state
    ORDER BY intensity DESC
    LIMIT 10
  ) h;

  -- 7. Tendência Diária
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_daily_trends
  FROM (
    SELECT
      TO_CHAR(occurred_at, 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE event_type = 'view') AS views,
      COUNT(*) FILTER (WHERE event_type IN ('whatsapp_click', 'phone_click', 'website_click', 'directions_click')) AS interactions
    FROM public.directory_analytics_events
    WHERE business_id = p_business_id AND occurred_at >= v_start_date
    GROUP BY TO_CHAR(occurred_at, 'YYYY-MM-DD')
    ORDER BY day ASC
  ) t;

  RETURN jsonb_build_object(
    'days', p_days,
    'views', v_views_current,
    'views_prev', v_views_prev,
    'views_growth_percent', v_views_growth,
    'interactions', v_total_interactions,
    'interactions_prev', v_prev_interactions,
    'interactions_growth_percent', v_interactions_growth,
    'interaction_rate_percent', v_interaction_rate,
    'breakdown', jsonb_build_object(
      'whatsapp', v_whatsapp,
      'phone', v_phone,
      'website', v_website,
      'directions', v_directions,
      'benefits', v_benefits,
      'social', v_social,
      'services', v_services
    ),
    'top_cities', v_top_cities,
    'aggregated_heatmap', v_aggregated_heatmap,
    'daily_trends', v_daily_trends,
    'has_data', (v_views_current > 0 OR v_total_interactions > 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_advertiser_analytics_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advertiser_analytics_summary(UUID, INTEGER) TO service_role;
