-- ============================================================================
-- Migration 089: Fix public_directory_home_data icon_name Column Resolution
-- Fixes column reference from c.icon_name to fc.icon_name in featured categories aggregation
-- ============================================================================

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

  -- 3. Featured Categories (Usa fc.icon_name de directory_featured_categories)
  SELECT COALESCE(jsonb_agg(c_json ORDER BY c_order), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'name', COALESCE(fc.custom_title, c.name),
        'slug', c.slug,
        'icon_name', fc.icon_name
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

  -- 5. Available Cities (Cidades únicas de empresas ativas publicadas)
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
      AND bl.city IS NOT NULL AND TRIM(bl.city) <> ''
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
