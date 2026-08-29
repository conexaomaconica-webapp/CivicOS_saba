-- Migration 071: Fix public_businesses_search RPC
-- Corrige a referência de colunas inexistentes na RPC public_businesses_search.

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

  -- 1. Total Count Query
  SELECT COUNT(DISTINCT b.id) INTO v_total
  FROM public.businesses b
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
        'is_verified', public._business_is_registration_verified(b.tenant_id, b.id),
        'is_founder', public._business_is_founder(b.tenant_id, b.id),
        'effective_plan_code', effective_plan.plan_code
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
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id AND bm.business_id = b.id AND bm.media_type = 'image'
      ORDER BY bm.display_order, bm.id
      LIMIT 1
    ) media_cover ON true
    LEFT JOIN LATERAL (
      SELECT bp.plan_code
      FROM public.business_subscriptions bs
      JOIN public.billing_plans bp ON bp.id = bs.plan_id
      WHERE bs.tenant_id = b.tenant_id AND bs.business_id = b.id AND bs.status IN ('active', 'trailing')
      ORDER BY bs.created_at DESC
      LIMIT 1
    ) effective_plan ON true
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
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
