-- Migration 056: Advanced Directory Search RPC & Distance/Relationship Governance
-- Enables multi-filter arrays (relationships, recognitions, plans, slugs), state filtering, distance calculations, and strict privacy governance.

-- Drop existing RPC overloaded signatures
DROP FUNCTION IF EXISTS public.public_businesses_search CASCADE;
DROP FUNCTION IF EXISTS public.public_businesses_search(text, text, text, text, boolean, boolean, text, integer, integer);
DROP FUNCTION IF EXISTS public.public_businesses_search(text, text, text, text, text, text[], text[], text[], boolean, boolean, double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.public_businesses_search(text, text, text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer);
DROP FUNCTION IF EXISTS public.public_businesses_search(text, text, text[], text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer);

CREATE OR REPLACE FUNCTION public.public_businesses_search(
  p_host text,
  p_query text DEFAULT NULL,
  p_slugs text[] DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_subcategory_slug text DEFAULT NULL,
  p_relationships text[] DEFAULT NULL,
  p_recognitions text[] DEFAULT NULL,
  p_plans text[] DEFAULT NULL,
  p_verified boolean DEFAULT NULL,
  p_has_benefits boolean DEFAULT NULL,
  p_user_lat numeric DEFAULT NULL,
  p_user_lng numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL,
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
  v_state TEXT;
  v_city TEXT;
  v_category_slug TEXT;
  v_subcategory_slug TEXT;
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
  v_state := NULLIF(btrim(p_state), '');
  v_city := NULLIF(btrim(p_city), '');
  v_category_slug := NULLIF(btrim(p_category_slug), '');
  v_subcategory_slug := NULLIF(btrim(p_subcategory_slug), '');
  v_verified := p_verified;
  v_has_benefits := p_has_benefits;
  v_sort := COALESCE(lower(btrim(p_sort)), 'relevance');
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 100);
  v_offset := (v_page - 1) * v_page_size;

  -- Base CTE with business data, location, plan, recognitions and distance calculation
  WITH business_data AS (
    SELECT DISTINCT ON (b.id)
      b.id,
      b.slug,
      b.name,
      b.short_description,
      b.description,
      b.logo_url,
      b.cover_url,
      b.is_active,
      b.publication_status,
      b.is_masonic_connection_public,
      b.masonic_relationship_type,
      b.masonic_member_name,
      b.masonic_brother_name,
      b.masonic_lodge_name,
      bl.city,
      bl.state,
      bl.latitude,
      bl.longitude,
      c.name AS category_name,
      c.slug AS category_slug,
      c.id AS category_id,
      -- Distance calculation in KM (Haversine formula, PostGIS ready)
      (
        CASE 
          WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND bl.latitude IS NOT NULL AND bl.longitude IS NOT NULL THEN
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(p_user_lat)) * cos(radians(bl.latitude)) *
                cos(radians(bl.longitude) - radians(p_user_lng)) +
                sin(radians(p_user_lat)) * sin(radians(bl.latitude))
              ))
            )
          ELSE NULL
        END
      ) AS distance_km,
      -- Verification flag
      COALESCE(public._business_is_registration_verified(b.tenant_id, b.id), false) AS is_verified,
      -- Effective plan resolution
      COALESCE(public._business_effective_plan_code(b.tenant_id, b.id), 'bronze') AS plan_code,
      -- Founder and Pedra Fundamental recognitions
      COALESCE((
        SELECT is_active FROM public.directory_sponsored_businesses 
        WHERE tenant_id = b.tenant_id AND business_id = b.id AND priority >= 90
        LIMIT 1
      ), false) AS is_pedra_fundamental,
      COALESCE(b.is_founder, false) AS is_founder
    FROM public.businesses b
    LEFT JOIN public.business_locations bl ON bl.tenant_id = b.tenant_id AND bl.business_id = b.id
    LEFT JOIN public.business_categories bc ON bc.tenant_id = b.tenant_id AND bc.business_id = b.id
    LEFT JOIN public.categories c ON c.id = bc.category_id AND c.is_active = true
    LEFT JOIN public.business_benefits ben ON ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      -- Slugs array filter
      AND (
        p_slugs IS NULL 
        OR CARDINALITY(p_slugs) = 0 
        OR lower(b.slug) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_slugs) x))
      )
      -- Text query
      AND (
        v_query IS NULL 
        OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
        OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(c.name) LIKE '%' || public._normalize_search(v_query) || '%'
        OR lower(b.slug) = lower(v_query)
        OR lower(b.slug) LIKE '%' || lower(v_query) || '%'
      )
      -- Location filters
      AND (v_state IS NULL OR lower(bl.state) = lower(v_state))
      AND (v_city IS NULL OR lower(bl.city) = lower(v_city))
      -- Category filters
      AND (v_category_slug IS NULL OR c.slug = v_category_slug)
      -- Verification filter
      AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
      -- Benefits filter
      AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL)
  ),
  filtered_data AS (
    SELECT *,
      -- Array of institutional recognitions
      (
        SELECT ARRAY_REMOVE(ARRAY[
          CASE WHEN is_pedra_fundamental THEN 'pedra_fundamental' ELSE NULL END,
          CASE WHEN is_founder THEN 'coluna_honra' ELSE NULL END
        ], NULL)
      ) AS recognitions
    FROM business_data
    WHERE 1=1
      -- Distance filter
      AND (p_max_distance_km IS NULL OR distance_km IS NULL OR distance_km <= p_max_distance_km)
      -- Masonic Relationship array filter
      AND (
        p_relationships IS NULL 
        OR CARDINALITY(p_relationships) = 0
        OR lower(masonic_relationship_type) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_relationships) x))
      )
      -- Commercial Plan array filter
      AND (
        p_plans IS NULL 
        OR CARDINALITY(p_plans) = 0
        OR lower(plan_code) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_plans) x))
      )
      -- Institutional Recognitions array filter
      AND (
        p_recognitions IS NULL 
        OR CARDINALITY(p_recognitions) = 0
        OR (
          ('pedra_fundamental' = ANY(p_recognitions) AND is_pedra_fundamental)
          OR ('coluna_honra' = ANY(p_recognitions) AND is_founder)
        )
      )
  )
  -- Count Total
  SELECT COUNT(*) INTO v_total FROM filtered_data;
  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  -- Fetch Items Json
  WITH filtered_data AS (
    SELECT *,
      (
        SELECT ARRAY_REMOVE(ARRAY[
          CASE WHEN is_pedra_fundamental THEN 'pedra_fundamental' ELSE NULL END,
          CASE WHEN is_founder THEN 'coluna_honra' ELSE NULL END
        ], NULL)
      ) AS recognitions
    FROM business_data
    WHERE 1=1
      AND (p_max_distance_km IS NULL OR distance_km IS NULL OR distance_km <= p_max_distance_km)
      AND (
        p_relationships IS NULL 
        OR CARDINALITY(p_relationships) = 0
        OR lower(masonic_relationship_type) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_relationships) x))
      )
      AND (
        p_plans IS NULL 
        OR CARDINALITY(p_plans) = 0
        OR lower(plan_code) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_plans) x))
      )
      AND (
        p_recognitions IS NULL 
        OR CARDINALITY(p_recognitions) = 0
        OR (
          ('pedra_fundamental' = ANY(p_recognitions) AND is_pedra_fundamental)
          OR ('coluna_honra' = ANY(p_recognitions) AND is_founder)
        )
      )
  )
  SELECT COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT 
      jsonb_build_object(
        'id', id,
        'slug', slug,
        'name', name,
        'short_description', short_description,
        'logo_url', logo_url,
        'cover_url', cover_url,
        'category_name', category_name,
        'category_slug', category_slug,
        'city', city,
        'state', state,
        'latitude', latitude,
        'longitude', longitude,
        'distance_km', ROUND(distance_km::numeric, 1),
        'is_verified', is_verified,
        'plan_code', plan_code,
        'recognitions', recognitions,
        'is_founder', is_founder,
        'is_pedra_fundamental', is_pedra_fundamental,
        -- Secure Masonic Connection Payload (Evaluated at Database level)
        'masonic_connection', (
          CASE 
            WHEN is_masonic_connection_public = true AND (masonic_member_name IS NOT NULL OR masonic_relationship_type IS NOT NULL) THEN
              jsonb_build_object(
                'type', COALESCE(masonic_relationship_type, 'brother'),
                'public_name', masonic_member_name,
                'brother_name', masonic_brother_name,
                'lodge_name', masonic_lodge_name
              )
            ELSE NULL
          END
        )
      ) AS item_json
    FROM filtered_data
    ORDER BY
      CASE WHEN v_sort = 'distance' THEN distance_km END ASC NULLS LAST,
      CASE WHEN v_sort = 'recent' THEN id END DESC,
      CASE WHEN v_sort = 'name' THEN name END ASC,
      -- Default: Relevance (Pedra Fundamental > Coluna de Honra > Ouro > Prata > Bronze)
      is_pedra_fundamental DESC,
      is_founder DESC,
      CASE plan_code WHEN 'ouro' THEN 3 WHEN 'prata' THEN 2 ELSE 1 END DESC,
      name ASC
    LIMIT v_page_size OFFSET v_offset
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

ALTER FUNCTION public.public_businesses_search(text, text, text[], text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_businesses_search(text, text, text[], text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_businesses_search(text, text, text[], text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer) TO anon, authenticated;
