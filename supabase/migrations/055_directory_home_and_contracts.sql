-- ============================================================================
-- Migration 055: Directory Home Dynamic Administration & Public Contracts
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Schema Extensions for Masonic Organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- ---------------------------------------------------------------------------
-- 1. Tables for Directory Home Configuration (Admin & Public read)
-- ---------------------------------------------------------------------------

-- A) Directory Home Settings
CREATE TABLE IF NOT EXISTS public.directory_home_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hero_title TEXT NOT NULL DEFAULT 'Encontre empresas, serviços e conexões de confiança',
  hero_subtitle TEXT DEFAULT 'Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.',
  hero_search_placeholder TEXT DEFAULT 'Pergunte à busca inteligente...',
  default_page_size INTEGER NOT NULL DEFAULT 12,
  sections_config JSONB NOT NULL DEFAULT '[
    {"id": "hero", "enabled": true, "order": 1},
    {"id": "carousel", "enabled": true, "order": 2},
    {"id": "categories", "enabled": true, "order": 3},
    {"id": "sponsored", "enabled": true, "order": 4},
    {"id": "all_businesses", "enabled": true, "order": 5},
    {"id": "map", "enabled": true, "order": 6},
    {"id": "lodges", "enabled": true, "order": 7}
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_directory_home_settings_tenant UNIQUE (tenant_id)
);

-- B) Directory Banners
CREATE TABLE IF NOT EXISTS public.directory_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT,
  cta_url TEXT,
  image_desktop_url TEXT NOT NULL,
  image_mobile_url TEXT,
  city TEXT, -- NULL indica exibição global no tenant
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C) Directory Featured Categories
CREATE TABLE IF NOT EXISTS public.directory_featured_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  custom_title TEXT,
  icon_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_directory_featured_categories UNIQUE (tenant_id, category_id)
);

-- D) Directory Sponsored Businesses Override
CREATE TABLE IF NOT EXISTS public.directory_sponsored_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_directory_sponsored_businesses UNIQUE (tenant_id, business_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_directory_banners_tenant_order ON public.directory_banners(tenant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_directory_featured_categories_tenant_order ON public.directory_featured_categories(tenant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_directory_sponsored_tenant_priority ON public.directory_sponsored_businesses(tenant_id, priority DESC);

-- Enable RLS
ALTER TABLE public.directory_home_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_featured_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_sponsored_businesses ENABLE ROW LEVEL SECURITY;

-- Public READ policies
DROP POLICY IF EXISTS "Public read directory_home_settings" ON public.directory_home_settings;
CREATE POLICY "Public read directory_home_settings" ON public.directory_home_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read directory_banners" ON public.directory_banners;
CREATE POLICY "Public read directory_banners" ON public.directory_banners
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read directory_featured_categories" ON public.directory_featured_categories;
CREATE POLICY "Public read directory_featured_categories" ON public.directory_featured_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read directory_sponsored_businesses" ON public.directory_sponsored_businesses;
CREATE POLICY "Public read directory_sponsored_businesses" ON public.directory_sponsored_businesses
  FOR SELECT USING (true);

-- Admin WRITE policies
DROP POLICY IF EXISTS "Tenant admin manage directory_home_settings" ON public.directory_home_settings;
CREATE POLICY "Tenant admin manage directory_home_settings" ON public.directory_home_settings
  FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Tenant admin manage directory_banners" ON public.directory_banners;
CREATE POLICY "Tenant admin manage directory_banners" ON public.directory_banners
  FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Tenant admin manage directory_featured_categories" ON public.directory_featured_categories;
CREATE POLICY "Tenant admin manage directory_featured_categories" ON public.directory_featured_categories
  FOR ALL USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Tenant admin manage directory_sponsored_businesses" ON public.directory_sponsored_businesses;
CREATE POLICY "Tenant admin manage directory_sponsored_businesses" ON public.directory_sponsored_businesses
  FOR ALL USING (public.has_tenant_admin_access(tenant_id));

-- ---------------------------------------------------------------------------
-- 2. RPC: public_directory_home_data
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_directory_home_data(TEXT, TEXT);

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

  -- 1. Settings
  SELECT jsonb_build_object(
    'hero_title', COALESCE(s.hero_title, 'Encontre empresas, serviços e conexões de confiança'),
    'hero_subtitle', s.hero_subtitle,
    'hero_search_placeholder', s.hero_search_placeholder,
    'default_page_size', COALESCE(s.default_page_size, 12),
    'sections_config', COALESCE(s.sections_config, '[]'::jsonb)
  ) INTO v_settings
  FROM (SELECT 1) _dummy
  LEFT JOIN public.directory_home_settings s ON s.tenant_id = v_tenant_id;

  -- 2. Banners
  SELECT COALESCE(jsonb_agg(b_json ORDER BY b_order), '[]'::jsonb)
  INTO v_banners
  FROM (
    SELECT 
      jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'subtitle', b.subtitle,
        'cta_text', b.cta_text,
        'cta_url', b.cta_url,
        'image_desktop_url', public._safe_public_url(b.image_desktop_url),
        'image_mobile_url', public._safe_public_url(b.image_mobile_url)
      ) AS b_json,
      b.display_order AS b_order
    FROM public.directory_banners b
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND (b.city IS NULL OR v_city_filter IS NULL OR lower(b.city) = lower(v_city_filter))
      AND (b.start_at IS NULL OR b.start_at <= now())
      AND (b.end_at IS NULL OR b.end_at >= now())
  ) sub;

  -- 3. Featured Categories
  SELECT COALESCE(jsonb_agg(c_json ORDER BY c_order), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'name', COALESCE(fc.custom_title, c.name),
        'icon_name', COALESCE(fc.icon_name, c.icon)
      ) AS c_json,
      fc.display_order AS c_order
    FROM public.directory_featured_categories fc
    JOIN public.categories c ON c.id = fc.category_id
    WHERE fc.tenant_id = v_tenant_id
      AND fc.is_active = true
      AND c.is_active = true
  ) sub;

  -- 4. Sponsored Businesses (Prioritizes directory_sponsored_businesses overrides over plan fallback)
  SELECT COALESCE(jsonb_agg(sp_json ORDER BY priority DESC, bus_name), '[]'::jsonb)
  INTO v_sponsored
  FROM (
    SELECT DISTINCT ON (b.id)
      jsonb_build_object(
        'id', b.id,
        'slug', b.slug,
        'name', b.name,
        'description', left(b.description, 300),
        'logo_url', public._safe_public_url(b.logo_url),
        'cover_url', public._safe_public_url(media_cover.url),
        'category_name', category.name,
        'city', location.city,
        'state', location.state,
        'is_verified', public._business_is_registration_verified(b.tenant_id, b.id),
        'is_founder', public._business_is_founder(b.tenant_id, b.id),
        'effective_plan', effective_plan.plan_code
      ) AS sp_json,
      COALESCE(sb.priority, CASE WHEN effective_plan.plan_code = 'ouro' THEN 100 WHEN effective_plan.plan_code = 'prata' THEN 50 ELSE 0 END) AS priority,
      b.name AS bus_name
    FROM public.businesses b
    LEFT JOIN public.directory_sponsored_businesses sb ON sb.business_id = b.id AND sb.tenant_id = b.tenant_id
    LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id) AS effective_plan ON true
    LEFT JOIN LATERAL (
      SELECT c.name
      FROM public.business_categories bc
      JOIN public.categories c ON c.id = bc.category_id
      WHERE bc.tenant_id = b.tenant_id AND bc.business_id = b.id AND c.is_active = true
      ORDER BY bc.is_primary DESC, c.display_order
      LIMIT 1
    ) category ON true
    LEFT JOIN LATERAL (
      SELECT bl.city, bl.state
      FROM public.business_locations bl
      WHERE bl.tenant_id = b.tenant_id AND bl.business_id = b.id
      ORDER BY bl.is_headquarters DESC, bl.id
      LIMIT 1
    ) location ON true
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id AND bm.business_id = b.id AND bm.media_type = 'image'
      ORDER BY bm.display_order, bm.id
      LIMIT 1
    ) media_cover ON true
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND (
        (sb.id IS NOT NULL AND sb.is_active = true AND (sb.start_at IS NULL OR sb.start_at <= now()) AND (sb.end_at IS NULL OR sb.end_at >= now()))
        OR (sb.id IS NULL AND effective_plan.plan_code IN ('ouro', 'prata'))
      )
      AND (v_city_filter IS NULL OR lower(location.city) = lower(v_city_filter))
  ) sub;

  -- 5. Distinct Available Cities for filter dropdown
  SELECT COALESCE(jsonb_agg(city_name ORDER BY city_name), '[]'::jsonb)
  INTO v_cities
  FROM (
    SELECT DISTINCT bl.city AS city_name
    FROM public.business_locations bl
    JOIN public.businesses b ON b.id = bl.business_id AND b.tenant_id = bl.tenant_id
    WHERE bl.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND bl.city IS NOT NULL AND btrim(bl.city) <> ''
  ) sub;

  RETURN jsonb_build_object(
    'settings', v_settings,
    'banners', v_banners,
    'categories', v_categories,
    'sponsored', v_sponsored,
    'available_cities', v_cities
  );
END;
$$;

ALTER FUNCTION public.public_directory_home_data(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_directory_home_data(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_directory_home_data(TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC: public_businesses_search (Paginated, Filtered)
-- ---------------------------------------------------------------------------

-- Helper Function: Accent-insensitive and Case-insensitive text normalization
CREATE OR REPLACE FUNCTION public._normalize_search(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(lower(COALESCE(p_text, '')), 
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn');
$$;

-- 2. RPC: public_businesses_search
CREATE OR REPLACE FUNCTION public.public_businesses_search(
  p_host text,
  p_query text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_verified boolean DEFAULT NULL,
  p_has_benefits boolean DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50); -- Capped at 50 max for security
  v_offset := (v_page - 1) * v_page_size;

  -- 1. Total Count Query
  SELECT COUNT(DISTINCT b.id) INTO v_total
  FROM public.businesses b
  LEFT JOIN public.business_locations bl ON bl.tenant_id = b.tenant_id AND bl.business_id = b.id
  LEFT JOIN public.business_categories bc ON bc.tenant_id = b.tenant_id AND bc.business_id = b.id
  LEFT JOIN public.categories c ON c.id = bc.category_id AND c.is_active = true
  LEFT JOIN public.business_benefits ben ON ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
  WHERE b.tenant_id = v_tenant_id
    AND b.is_active = true
    AND b.publication_status = 'published'
    AND (
      v_query IS NULL 
      OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
      OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
      OR public._normalize_search(c.name) LIKE '%' || public._normalize_search(v_query) || '%'
    )
    AND (v_city IS NULL OR lower(bl.city) = lower(v_city))
    AND (v_category_slug IS NULL OR c.slug = v_category_slug)
    AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
    AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL);

  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  -- 2. Items Query
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
        'city', location.city,
        'state', location.state,
        'is_verified', public._business_is_registration_verified(b.tenant_id, b.id),
        'is_founder', public._business_is_founder(b.tenant_id, b.id),
        'effective_plan_code', effective_plan.plan_code,
        'rating_average', rating.avg_rating,
        'reviews_count', COALESCE(rating.cnt_reviews, 0),
        'has_benefits', (benefit_check.cnt > 0),
        'latitude', location.latitude,
        'longitude', location.longitude
      ) AS item_json
    FROM public.businesses b
    LEFT JOIN LATERAL (
      SELECT c.slug, c.name
      FROM public.business_categories bc
      JOIN public.categories c ON c.id = bc.category_id
      WHERE bc.tenant_id = b.tenant_id AND bc.business_id = b.id AND c.is_active = true
      ORDER BY bc.is_primary DESC, c.display_order
      LIMIT 1
    ) category ON true
    LEFT JOIN LATERAL (
      SELECT bl.city, bl.state, bl.latitude, bl.longitude
      FROM public.business_locations bl
      WHERE bl.tenant_id = b.tenant_id AND bl.business_id = b.id
      ORDER BY bl.is_headquarters DESC, bl.id
      LIMIT 1
    ) location ON true
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id AND bm.business_id = b.id AND bm.media_type = 'image'
      ORDER BY bm.display_order, bm.id
      LIMIT 1
    ) media_cover ON true
    LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id) AS effective_plan ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM public.business_benefits ben
      WHERE ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
    ) benefit_check ON true
    LEFT JOIN LATERAL (
      SELECT AVG(rating)::NUMERIC(3,1) AS avg_rating, COUNT(*) AS cnt_reviews
      FROM public.business_reviews br
      WHERE br.tenant_id = b.tenant_id AND br.business_id = b.id AND br.status = 'published'
    ) rating ON true
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND (
        v_query IS NULL 
        OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
        OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(category.name) LIKE '%' || public._normalize_search(v_query) || '%'
      )
      AND (v_city IS NULL OR lower(location.city) = lower(v_city))
      AND (v_category_slug IS NULL OR category.slug = v_category_slug)
      AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
      AND (v_has_benefits IS NOT TRUE OR benefit_check.cnt > 0)
    ORDER BY 
      CASE WHEN v_sort = 'recent' THEN b.created_at END DESC,
      CASE WHEN v_sort = 'name' THEN b.name END ASC,
      CASE WHEN v_sort = 'featured' THEN CASE WHEN effective_plan.plan_code = 'ouro' THEN 1 WHEN effective_plan.plan_code = 'prata' THEN 2 ELSE 3 END END ASC,
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

ALTER FUNCTION public.public_businesses_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_businesses_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_businesses_search(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC: public_organizations_search (Masonic Lodges)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_organizations_search(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.public_organizations_search(
  p_host TEXT,
  p_city TEXT DEFAULT NULL,
  p_potency TEXT DEFAULT NULL,
  p_rite TEXT DEFAULT NULL,
  p_meeting_day INTEGER DEFAULT NULL,
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
  v_city TEXT;
  v_potency TEXT;
  v_rite TEXT;
  v_meeting_day INTEGER;
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

  v_city := NULLIF(btrim(p_city), '');
  v_potency := NULLIF(btrim(p_potency), '');
  v_rite := NULLIF(btrim(p_rite), '');
  v_meeting_day := p_meeting_day;
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50); -- Capped at 50 max for security
  v_offset := (v_page - 1) * v_page_size;

  -- Total count
  SELECT COUNT(*) INTO v_total
  FROM public.organizations o
  WHERE o.tenant_id = v_tenant_id
    AND o.is_active = true
    AND (v_city IS NULL OR lower(o.city) = lower(v_city))
    AND (v_potency IS NULL OR lower(o.potency) = lower(v_potency))
    AND (v_rite IS NULL OR lower(o.rite) = lower(v_rite));

  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  -- Items
  SELECT COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT 
      jsonb_build_object(
        'id', o.id,
        'slug', o.public_slug,
        'name', o.name,
        'code_number', o.code_number,
        'potency', o.potency,
        'rite', o.rite,
        'city', o.city,
        'state', o.state,
        'address', o.address,
        'latitude', o.latitude,
        'longitude', o.longitude,
        'foundation_date', o.foundation_date,
        'meeting_schedule', o.meeting_schedule,
        'contact_email', o.contact_email
      ) AS item_json
    FROM public.organizations o
    WHERE o.tenant_id = v_tenant_id
      AND o.is_active = true
      AND (v_city IS NULL OR lower(o.city) = lower(v_city))
      AND (v_potency IS NULL OR lower(o.potency) = lower(v_potency))
      AND (v_rite IS NULL OR lower(o.rite) = lower(v_rite))
    ORDER BY o.name ASC
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

ALTER FUNCTION public.public_organizations_search(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_organizations_search(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_organizations_search(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Default Seed Data for Canonical Demo Tenant
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000010';
BEGIN
  -- Default Home Settings
  INSERT INTO public.directory_home_settings (tenant_id, hero_title, hero_subtitle, hero_search_placeholder, default_page_size)
  VALUES (
    v_tenant_id,
    'Encontre empresas, serviços e conexões de confiança',
    'Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.',
    'Pergunte à busca inteligente...',
    12
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Default Banner
  IF NOT EXISTS (SELECT 1 FROM public.directory_banners WHERE tenant_id = v_tenant_id) THEN
    INSERT INTO public.directory_banners (tenant_id, title, subtitle, cta_text, cta_url, image_desktop_url, display_order)
    VALUES (
      v_tenant_id,
      'Conexões que geram oportunidades',
      'DESTAQUE DA SEMANA',
      'Conhecer empresas',
      '/guia',
      '/visual-lab/assets/banner-reference',
      1
    );
  END IF;

  -- Default Featured Categories
  INSERT INTO public.directory_featured_categories (tenant_id, category_id, custom_title, icon_name, display_order)
  SELECT v_tenant_id, c.id, c.name, c.icon, c.display_order
  FROM public.categories c
  WHERE c.tenant_id IS NULL OR c.tenant_id = v_tenant_id
  ON CONFLICT (tenant_id, category_id) DO NOTHING;
END $$;
