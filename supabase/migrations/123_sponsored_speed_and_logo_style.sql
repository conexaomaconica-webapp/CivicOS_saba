-- ============================================================================
-- Migration 123: Add sponsored_marquee_speed and sponsored_logo_style to directory_home_settings
-- ============================================================================

-- 1. Add columns to directory_home_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'directory_home_settings'
      AND column_name = 'sponsored_marquee_speed'
  ) THEN
    ALTER TABLE public.directory_home_settings
    ADD COLUMN sponsored_marquee_speed INTEGER NOT NULL DEFAULT 45;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'directory_home_settings'
      AND column_name = 'sponsored_logo_style'
  ) THEN
    ALTER TABLE public.directory_home_settings
    ADD COLUMN sponsored_logo_style TEXT NOT NULL DEFAULT 'standard';
  END IF;
END $$;

-- 2. Update public_directory_home_data RPC to return the new fields in settings
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
    'sponsored_display_mode', COALESCE(s.sponsored_display_mode, 'cards'),
    'sponsored_marquee_speed', COALESCE(s.sponsored_marquee_speed, 45),
    'sponsored_logo_style', COALESCE(s.sponsored_logo_style, 'standard')
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

  -- 3. Featured Categories (Preserve display_order from directory_featured_categories)
  SELECT COALESCE(jsonb_agg(c_json ORDER BY c_order), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'name', COALESCE(fc.custom_title, c.name),
        'slug', c.slug,
        'icon_name', COALESCE(fc.icon_name, c.icon)
      ) AS c_json,
      fc.display_order AS c_order
    FROM public.directory_featured_categories fc
    JOIN public.categories c ON c.id = fc.category_id
    WHERE fc.tenant_id = v_tenant_id
      AND fc.is_active = true
  ) sub_categories;

  -- 4. Sponsored Businesses (Overrides or Commercial Tier)
  SELECT COALESCE(jsonb_agg(sp_json ORDER BY sp_prio DESC, sp_name ASC), '[]'::jsonb)
  INTO v_sponsored
  FROM (
    -- Manual Overrides
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'description', b.description,
        'logo_url', public._safe_public_url(b.logo_url),
        'cover_url', public._safe_public_url(b.cover_url),
        'plan_tier', b.plan_tier,
        'city', bl.city,
        'state', bl.state,
        'category_name', c.name,
        'category_slug', c.slug,
        'is_featured', true
      ) AS sp_json,
      sb.priority AS sp_prio,
      b.name AS sp_name
    FROM public.directory_sponsored_businesses sb
    JOIN public.businesses b ON b.id = sb.business_id
    LEFT JOIN public.categories c ON c.name = b.category
    LEFT JOIN LATERAL (
      SELECT city, state FROM public.business_locations
      WHERE business_id = b.id
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    ) bl ON true
    WHERE sb.tenant_id = v_tenant_id
      AND sb.is_active = true
      AND b.publication_status = 'published'
      AND b.is_active = true
      AND (sb.city IS NULL OR v_city_filter IS NULL OR sb.city ILIKE v_city_filter)
      AND (sb.start_at IS NULL OR sb.start_at <= now())
      AND (sb.end_at IS NULL OR sb.end_at >= now())

    UNION ALL

    -- Commercial Tiers (Acacia / Compasso)
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'description', b.description,
        'logo_url', public._safe_public_url(b.logo_url),
        'cover_url', public._safe_public_url(b.cover_url),
        'plan_tier', b.plan_tier,
        'city', bl.city,
        'state', bl.state,
        'category_name', c.name,
        'category_slug', c.slug,
        'is_featured', true
      ) AS sp_json,
      CASE WHEN b.plan_tier = 'compasso' THEN 50 ELSE 25 END AS sp_prio,
      b.name AS sp_name
    FROM public.businesses b
    LEFT JOIN public.categories c ON c.name = b.category
    LEFT JOIN LATERAL (
      SELECT city, state FROM public.business_locations
      WHERE business_id = b.id
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    ) bl ON true
    WHERE b.tenant_id = v_tenant_id
      AND b.publication_status = 'published'
      AND b.is_active = true
      AND b.plan_tier IN ('acacia', 'compasso')
      AND (v_city_filter IS NULL OR bl.city ILIKE v_city_filter)
      AND NOT EXISTS (
        SELECT 1 FROM public.directory_sponsored_businesses sb
        WHERE sb.tenant_id = v_tenant_id
          AND sb.business_id = b.id
      )
  ) sub_sponsored;

  -- 5. Available Cities
  SELECT COALESCE(jsonb_agg(city_name ORDER BY city_name ASC), '[]'::jsonb)
  INTO v_cities
  FROM (
    SELECT DISTINCT bl.city AS city_name
    FROM public.business_locations bl
    JOIN public.businesses b ON b.id = bl.business_id
    WHERE b.tenant_id = v_tenant_id
      AND b.publication_status = 'published'
      AND b.is_active = true
      AND bl.city IS NOT NULL
      AND bl.city <> ''
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
