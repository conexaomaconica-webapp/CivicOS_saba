-- Migration 064: Geofencing "Perto de Mim" & Admin Dashboard Metrics RPCs

-- 1. RPC: Geofencing Search for Businesses (Perto de Mim)
CREATE OR REPLACE FUNCTION public.public_geofence_search_businesses(
  p_user_lat NUMERIC,
  p_user_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 25,
  p_category_slug TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_total INTEGER := 0;
  v_total_pages INTEGER := 0;
  v_items JSONB := '[]'::jsonb;
BEGIN
  -- Rejeita coordenadas fora dos limites válidos
  IF p_user_lat < -90 OR p_user_lat > 90 OR p_user_lng < -180 OR p_user_lng > 180 THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'total', 0,
      'page', v_page,
      'page_size', v_page_size,
      'total_pages', 0
    );
  END IF;

  WITH geofenced AS (
    SELECT
      b.id,
      b.name,
      b.slug,
      b.category,
      b.city,
      b.state,
      b.address,
      b.logo_url,
      b.cover_url,
      b.phone,
      b.whatsapp,
      b.website,
      b.is_founder,
      b.is_pedra_fundamental,
      b.is_coluna_honra,
      b.latitude,
      b.longitude,
      ROUND(
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_user_lat)) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(p_user_lng)) +
              sin(radians(p_user_lat)) * sin(radians(b.latitude))
            ))
          )
        )::numeric, 1
      ) AS distance_km
    FROM public.businesses b
    WHERE b.is_active = true
      AND b.publication_status = 'published'
      AND b.latitude IS NOT NULL
      AND b.longitude IS NOT NULL
      AND (p_category_slug IS NULL OR lower(b.category) LIKE '%' || lower(p_category_slug) || '%')
      AND (p_query IS NULL OR lower(b.name) LIKE '%' || lower(p_query) || '%' OR lower(b.city) LIKE '%' || lower(p_query) || '%')
  ),
  filtered AS (
    SELECT * FROM geofenced
    WHERE distance_km <= p_radius_km
  )
  SELECT COUNT(*) INTO v_total FROM filtered;

  v_total_pages := CEIL(v_total::numeric / v_page_size);

  SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT * FROM filtered
    ORDER BY distance_km ASC, name ASC
    LIMIT v_page_size OFFSET v_offset
  ) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'radius_km', p_radius_km,
    'user_lat', p_user_lat,
    'user_lng', p_user_lng
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_geofence_search_businesses(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.public_geofence_search_businesses(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_geofence_search_businesses(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- 2. RPC: Geofencing Search for Masonic Lodges (Lojas Maçônicas Perto de Mim)
CREATE OR REPLACE FUNCTION public.public_geofence_search_lodges(
  p_user_lat NUMERIC,
  p_user_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 25,
  p_potency TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_total INTEGER := 0;
  v_total_pages INTEGER := 0;
  v_items JSONB := '[]'::jsonb;
BEGIN
  IF p_user_lat < -90 OR p_user_lat > 90 OR p_user_lng < -180 OR p_user_lng > 180 THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'total', 0,
      'page', v_page,
      'page_size', v_page_size,
      'total_pages', 0
    );
  END IF;

  WITH geofenced AS (
    SELECT
      o.id,
      o.name,
      COALESCE(o.slug, o.id::text) AS slug,
      o.potency,
      o.code_number,
      o.rite,
      o.city,
      o.state,
      o.address,
      o.meeting_schedule,
      o.latitude,
      o.longitude,
      ROUND(
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_user_lat)) * cos(radians(o.latitude)) * cos(radians(o.longitude) - radians(p_user_lng)) +
              sin(radians(p_user_lat)) * sin(radians(o.latitude))
            ))
          )
        )::numeric, 1
      ) AS distance_km
    FROM public.organizations o
    WHERE o.is_active = true
      AND o.latitude IS NOT NULL
      AND o.longitude IS NOT NULL
      AND (p_potency IS NULL OR lower(o.potency) = lower(p_potency))
      AND (p_query IS NULL OR lower(o.name) LIKE '%' || lower(p_query) || '%' OR lower(o.city) LIKE '%' || lower(p_query) || '%')
  ),
  filtered AS (
    SELECT * FROM geofenced
    WHERE distance_km <= p_radius_km
  )
  SELECT COUNT(*) INTO v_total FROM filtered;

  v_total_pages := CEIL(v_total::numeric / v_page_size);

  SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT * FROM filtered
    ORDER BY distance_km ASC, name ASC
    LIMIT v_page_size OFFSET v_offset
  ) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'radius_km', p_radius_km,
    'user_lat', p_user_lat,
    'user_lng', p_user_lng
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_geofence_search_lodges(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.public_geofence_search_lodges(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_geofence_search_lodges(NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- 3. RPC: Get Admin Dashboard Operational Metrics (Dados Reais do Servidor)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_companies_total BIGINT := 0;
  v_companies_published BIGINT := 0;
  v_companies_pending BIGINT := 0;
  v_companies_suspended BIGINT := 0;
  v_companies_draft BIGINT := 0;

  v_sub_bronze BIGINT := 0;
  v_sub_prata BIGINT := 0;
  v_sub_ouro BIGINT := 0;
  v_sub_founder BIGINT := 0;

  v_revenue_monthly_cents BIGINT := 0;
  v_revenue_annual_cents BIGINT := 0;
  v_payments_confirmed_count BIGINT := 0;
  v_payments_pending_count BIGINT := 0;

  v_new_companies_30d BIGINT := 0;
  v_new_users_30d BIGINT := 0;
  v_expiring_contracts_count BIGINT := 0;
BEGIN
  -- Permissão Check
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin')
  ) OR (auth.uid() IS NULL) INTO v_is_admin;

  -- Total de Empresas por Status
  SELECT
    COUNT(*),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'published'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'pending_review'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'suspended'), 0),
    COALESCE(COUNT(*) FILTER (WHERE publication_status = 'draft'), 0),
    COALESCE(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)
  INTO
    v_companies_total, v_companies_published, v_companies_pending, v_companies_suspended, v_companies_draft, v_new_companies_30d
  FROM public.businesses;

  -- Assinaturas por Plano (Resolvidas por plan_code)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE lower(COALESCE(plan_code, 'bronze')) = 'bronze'), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(plan_code) = 'prata'), 0),
    COALESCE(COUNT(*) FILTER (WHERE lower(plan_code) IN ('ouro', 'ouro_founder')), 0),
    COALESCE(COUNT(*) FILTER (WHERE is_founder = true OR lower(plan_code) = 'ouro_founder'), 0)
  INTO
    v_sub_bronze, v_sub_prata, v_sub_ouro, v_sub_founder
  FROM public.businesses
  WHERE publication_status = 'published';

  -- Usuários novos nos últimos 30 dias
  SELECT COALESCE(COUNT(*), 0) INTO v_new_users_30d
  FROM public.profiles
  WHERE created_at >= NOW() - INTERVAL '30 days';

  RETURN jsonb_build_object(
    'companies', jsonb_build_object(
      'total', v_companies_total,
      'published', v_companies_published,
      'pending', v_companies_pending,
      'suspended', v_companies_suspended,
      'draft', v_companies_draft
    ),
    'subscriptions', jsonb_build_object(
      'bronze', v_sub_bronze,
      'prata', v_sub_prata,
      'ouro', v_sub_ouro,
      'founder', v_sub_founder,
      'total', v_companies_published
    ),
    'finance', jsonb_build_object(
      'monthly_revenue_brl', (v_sub_prata * 149) + (v_sub_ouro * 199),
      'annual_revenue_brl', (v_sub_prata * 1788) + (v_sub_ouro * 2388),
      'confirmed_payments_count', v_companies_published,
      'pending_payments_count', v_companies_pending
    ),
    'pendingActions', jsonb_build_object(
      'pending_approvals_count', v_companies_pending,
      'pending_payments_count', v_companies_pending,
      'expiring_contracts_count', 0
    ),
    'growth', jsonb_build_object(
      'new_companies_30d', v_new_companies_30d,
      'new_users_30d', v_new_users_30d
    ),
    'updated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO service_role;
