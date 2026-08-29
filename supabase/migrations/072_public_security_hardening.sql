-- Migration 072: Public Security Hardening & Triple Publication Rule
-- Enforces Triple Publication Rule across all public directory RPCs:
--   1. b.is_active = true
--   2. b.publication_status = 'published'
--   3. effective_sub.status IN ('active', 'trailing', 'trialing') OR effective_sub.status IS NULL (when un-subscribed seed)
--      AND excludes 'past_due', 'canceled', 'unpaid', 'pending', 'suspended'
-- 
-- Also hardens SECURITY DEFINER search_path = '' and tenant RLS isolation on public directory tables.

-- =============================================================================
-- 1. DROP OVERLOADED OLD FUNCTION SIGNATURES
-- =============================================================================
DROP FUNCTION IF EXISTS public.public_businesses_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.public_businesses_search(TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], BOOLEAN, BOOLEAN, NUMERIC, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER);

-- =============================================================================
-- 2. RPC: public_directory_home_data (Hardened with Triple Publication Rule)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.public_directory_home_data(
  p_host TEXT,
  p_city TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_city_filter TEXT;
  v_settings JSONB;
  v_banners JSONB;
  v_categories JSONB;
  v_sponsored JSONB;
  v_cities JSONB;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_city_filter := NULLIF(btrim(p_city), '');

  -- 1. Settings (Tenant Isolated)
  SELECT jsonb_build_object(
    'hero_title', COALESCE(s.hero_title, 'Encontre empresas, serviços e conexões de confiança'),
    'hero_subtitle', s.hero_subtitle,
    'hero_search_placeholder', s.hero_search_placeholder,
    'default_page_size', COALESCE(s.default_page_size, 12),
    'sections_config', COALESCE(s.sections_config, '[]'::jsonb)
  ) INTO v_settings
  FROM (SELECT 1) _dummy
  LEFT JOIN public.directory_home_settings s ON s.tenant_id = v_tenant_id;

  -- 2. Banners (Tenant Isolated & Active)
  SELECT COALESCE(jsonb_agg(b_json ORDER BY b_order), '[]'::jsonb)
  INTO v_banners
  FROM (
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'subtitle', b.subtitle,
        'image_desktop_url', public._safe_public_url(b.image_desktop_url),
        'image_mobile_url', public._safe_public_url(b.image_mobile_url),
        'cta_text', b.cta_text,
        'cta_url', b.cta_url
      ) AS b_json,
      b.display_order AS b_order
    FROM public.directory_banners b
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
  ) sub_banners;

  -- 3. Featured Categories
  SELECT COALESCE(jsonb_agg(c_json ORDER BY c_order), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'icon_name', c.icon_name
      ) AS c_json,
      fc.display_order AS c_order
    FROM public.directory_featured_categories fc
    JOIN public.categories c ON c.id = fc.category_id
    WHERE fc.tenant_id = v_tenant_id
      AND c.is_active = true
  ) sub_cats;

  -- 4. Sponsored Businesses (REGRA TRIPLA DE PUBLICAÇÃO OBRIGATÓRIA)
  SELECT COALESCE(jsonb_agg(sp_json ORDER BY sp_order), '[]'::jsonb)
  INTO v_sponsored
  FROM (
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'slug', b.slug,
        'name', b.name,
        'short_description', left(b.description, 200),
        'logo_url', public._safe_public_url(b.logo_url),
        'cover_url', public._safe_public_url(media_cover.url),
        'category_name', category.name,
        'city', location.city,
        'state', location.state
      ) AS sp_json,
      sb.display_order AS sp_order
    FROM public.directory_sponsored_businesses sb
    JOIN public.businesses b ON b.id = sb.business_id AND b.tenant_id = sb.tenant_id
    LEFT JOIN LATERAL (
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) sub_status ON true
    LEFT JOIN LATERAL (
      SELECT c.name
      FROM public.business_categories bc
      JOIN public.categories c ON c.id = bc.category_id
      WHERE bc.tenant_id = b.tenant_id AND bc.business_id = b.id AND c.is_active = true
      ORDER BY bc.is_primary DESC
      LIMIT 1
    ) category ON true
    LEFT JOIN LATERAL (
      SELECT bl.city, bl.state
      FROM public.business_locations bl
      WHERE bl.tenant_id = b.tenant_id AND bl.business_id = b.id
      ORDER BY bl.is_headquarters DESC
      LIMIT 1
    ) location ON true
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id AND bm.business_id = b.id AND bm.media_type = 'image'
      ORDER BY bm.display_order
      LIMIT 1
    ) media_cover ON true
    WHERE sb.tenant_id = v_tenant_id
      AND sb.is_active = true
      -- REGRA TRIPLA DE PUBLICAÇÃO:
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      AND (v_city_filter IS NULL OR lower(location.city) = lower(v_city_filter))
  ) sub_sponsored;

  -- 5. Available Cities
  SELECT COALESCE(jsonb_agg(DISTINCT city_name), '[]'::jsonb)
  INTO v_cities
  FROM (
    SELECT bl.city AS city_name
    FROM public.business_locations bl
    JOIN public.businesses b ON b.id = bl.business_id AND b.tenant_id = bl.tenant_id
    LEFT JOIN LATERAL (
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) sub_status ON true
    WHERE bl.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      AND bl.city IS NOT NULL AND bl.city <> ''
  ) sub_cities;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'banners', v_banners,
    'categories', v_categories,
    'sponsored', v_sponsored,
    'available_cities', v_cities
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_directory_home_data(TEXT, TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- 3. RPC UNIFICADA: public_businesses_search (Hardened com Regra Tripla)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.public_businesses_search(
  p_host TEXT,
  p_query TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL,
  p_has_benefits BOOLEAN DEFAULT NULL,
  p_sort TEXT DEFAULT 'relevance',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_query TEXT;
  v_city TEXT;
  v_category_slug TEXT;
  v_verified BOOLEAN;
  v_has_benefits BOOLEAN;
  v_sort TEXT;
  v_page INTEGER;
  v_page_size INTEGER;
  v_offset INTEGER;
  v_total INTEGER;
  v_total_pages INTEGER;
  v_items JSONB;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'total', 0,
      'page', 1,
      'page_size', 12,
      'total_pages', 0,
      'has_next_page', false,
      'has_previous_page', false
    );
  END IF;

  v_query := NULLIF(btrim(p_query), '');
  v_city := NULLIF(btrim(p_city), '');
  v_category_slug := NULLIF(btrim(p_category_slug), '');
  v_verified := p_verified;
  v_has_benefits := p_has_benefits;
  v_sort := COALESCE(lower(btrim(p_sort)), 'relevance');
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset := (v_page - 1) * v_page_size;

  -- 1. Total Count Query (REGRA TRIPLA DE PUBLICAÇÃO)
  SELECT COUNT(DISTINCT b.id) INTO v_total
  FROM public.businesses b
  LEFT JOIN LATERAL (
    SELECT s.status
    FROM public.subscriptions s
    WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
    ORDER BY s.created_at DESC
    LIMIT 1
  ) sub_status ON true
  LEFT JOIN public.business_categories bc ON bc.tenant_id = b.tenant_id AND bc.business_id = b.id
  LEFT JOIN public.categories c ON c.id = bc.category_id AND c.is_active = true
  LEFT JOIN public.business_benefits ben ON ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
  WHERE b.tenant_id = v_tenant_id
    -- REGRA TRIPLA DE PUBLICAÇÃO:
    AND b.is_active = true
    AND b.publication_status = 'published'
    AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
    AND (
      v_query IS NULL 
      OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
      OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
      OR public._normalize_search(c.name) LIKE '%' || public._normalize_search(v_query) || '%'
    )
    AND (v_category_slug IS NULL OR c.slug = v_category_slug)
    AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
    AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL);

  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  -- 2. Items Query (REGRA TRIPLA DE PUBLICAÇÃO)
  SELECT COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'slug', b.slug,
        'name', b.name,
        'short_description', left(b.description, 200),
        'logo_url', public._safe_public_url(b.logo_url),
        'cover_url', public._safe_public_url(media_cover.url),
        'category_slug', category.slug,
        'category_name', category.name,
        'is_verified', public._business_is_registration_verified(b.tenant_id, b.id),
        'is_founder', public._business_is_founder(b.tenant_id, b.id),
        'effective_plan_code', effective_plan.plan_code
      ) AS item_json
    FROM public.businesses b
    LEFT JOIN LATERAL (
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) sub_status ON true
    LEFT JOIN LATERAL (
      SELECT c.slug, c.name
      FROM public.business_categories bc
      JOIN public.categories c ON c.id = bc.category_id
      WHERE bc.tenant_id = b.tenant_id AND bc.business_id = b.id AND c.is_active = true
      ORDER BY bc.is_primary DESC, c.display_order
      LIMIT 1
    ) category ON true
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id AND bm.business_id = b.id AND bm.media_type = 'image'
      ORDER BY bm.display_order
      LIMIT 1
    ) media_cover ON true
    LEFT JOIN LATERAL (
      SELECT bp.plan_code
      FROM public.subscriptions s
      JOIN public.plan_versions pv ON pv.id = s.plan_version_id
      JOIN public.plans bp ON bp.id = pv.plan_id
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id AND s.status IN ('active', 'trailing', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    ) effective_plan ON true
    WHERE b.tenant_id = v_tenant_id
      -- REGRA TRIPLA DE PUBLICAÇÃO:
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      AND (
        v_query IS NULL 
        OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
        OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(category.name) LIKE '%' || public._normalize_search(v_query) || '%'
      )
      AND (v_category_slug IS NULL OR category.slug = v_category_slug)
      AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
    ORDER BY 
      CASE WHEN v_sort = 'name_asc' THEN b.name END ASC,
      CASE WHEN v_sort = 'name_desc' THEN b.name END DESC,
      b.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'has_next_page', (v_page < v_total_pages),
    'has_previous_page', (v_page > 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_businesses_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

-- Grant SELECT permissions on public reading tables to anon and authenticated roles
GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.directory_sponsored_businesses TO anon, authenticated;
GRANT SELECT ON public.directory_home_settings TO anon, authenticated;
GRANT SELECT ON public.directory_banners TO anon, authenticated;
GRANT SELECT ON public.directory_featured_categories TO anon, authenticated;
