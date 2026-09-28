-- ============================================================================
-- Migration 118: Add sponsored_display_mode to directory_home_settings & update RPC
-- ============================================================================

-- 1. Add column to directory_home_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'directory_home_settings'
      AND column_name = 'sponsored_display_mode'
  ) THEN
    ALTER TABLE public.directory_home_settings
    ADD COLUMN sponsored_display_mode TEXT NOT NULL DEFAULT 'cards';
  END IF;
END $$;

-- 2. Update public_directory_home_data RPC to return sponsored_display_mode in settings
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
    'sections_config', COALESCE(s.sections_config, '[]'::jsonb),
    'sponsored_display_mode', COALESCE(s.sponsored_display_mode, 'cards')
  ) INTO v_settings
  FROM (SELECT 1) _dummy
  LEFT JOIN public.directory_home_settings s ON s.tenant_id = v_tenant_id;

  -- 2. Banners (Tenant Isolated & Active & Scheduled)
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
      AND (b.start_at IS NULL OR b.start_at <= now())
      AND (b.end_at IS NULL OR b.end_at >= now())
  ) sub_banners;

  -- 3. Categories (Tenant Isolated & Active)
  SELECT COALESCE(jsonb_agg(c_json ORDER BY c_order), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'icon', c.icon,
        'image_url', public._safe_public_url(c.image_url)
      ) AS c_json,
      c.display_order AS c_order
    FROM public.categories c
    WHERE c.tenant_id = v_tenant_id
      AND c.is_active = true
  ) sub_categories;

  -- 4. Sponsored Businesses (Explicit Override or Recent Published Fallback)
  SELECT COALESCE(jsonb_agg(sp_json ORDER BY sp_order DESC), '[]'::jsonb)
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
      sb.priority AS sp_order
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
      WHERE bl.business_id = b.id
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
      AND (sb.start_at IS NULL OR sb.start_at <= now())
      AND (sb.end_at IS NULL OR sb.end_at >= now())
      -- REGRA TRIPLA DE PUBLICAÇÃO:
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      AND (v_city_filter IS NULL OR lower(location.city) = lower(v_city_filter))
  ) sub_sponsored;

  -- Fallback de Empresas Patrocinadas: Se não houver destaques manuais no tenant, exibir empresas publicadas ativas recentes
  IF v_sponsored = '[]'::jsonb THEN
    SELECT COALESCE(jsonb_agg(sp_json), '[]'::jsonb)
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
        ) AS sp_json
      FROM public.businesses b
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
        WHERE bl.business_id = b.id
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
      WHERE b.tenant_id = v_tenant_id
        AND b.is_active = true
        AND b.publication_status = 'published'
        AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
        AND (v_city_filter IS NULL OR lower(location.city) = lower(v_city_filter))
      ORDER BY b.created_at DESC
      LIMIT 6
    ) fallback_sponsored;
  END IF;

  -- 5. Available Cities (Filtering only published commercial businesses)
  SELECT COALESCE(jsonb_agg(DISTINCT city_val ORDER BY city_val), '[]'::jsonb)
  INTO v_cities
  FROM (
    SELECT DISTINCT btrim(bl.city) AS city_val
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
      AND bl.city IS NOT NULL
      AND btrim(bl.city) <> ''
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
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
