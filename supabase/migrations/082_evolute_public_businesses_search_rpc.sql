-- Migration 082: Evolute public_businesses_search RPC
-- Features:
--   1. Full PostgreSQL filtering for p_state, p_city, p_category_slug, p_relationships, p_recognitions, p_plans, p_verified BEFORE pagination and count.
--   2. Strict cover_url resolution (media_type IN ('cover', 'image') ORDER BY cover FIRST).
--   3. Business Recognitions join (from business_recognitions table).
--   4. Hardened SECURITY DEFINER SET search_path = '' and Triple Publication Rule.

DROP FUNCTION IF EXISTS public.public_businesses_search CASCADE;
DROP FUNCTION IF EXISTS public.public_businesses_search(text, text, text, text, boolean, boolean, text, integer, integer);
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
STABLE
SET search_path = ''
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
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 100);
  v_offset := (v_page - 1) * v_page_size;

  -- 1. Base CTE de empresas filtradas na fonte (PostgreSQL)
  WITH filtered_data AS (
    SELECT DISTINCT ON (b.id)
      b.id,
      b.slug,
      b.name,
      left(b.description, 200) AS short_description,
      b.description,
      public._safe_public_url(b.logo_url) AS logo_url,
      public._safe_public_url(media_cover.url) AS cover_url,
      b.is_active,
      b.publication_status,
      bl.city,
      bl.state,
      bl.latitude,
      bl.longitude,
      c.name AS category_name,
      c.slug AS category_slug,
      -- Cálculo de Distância Geodésica (KM)
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
      -- Verificação de Vínculo Maçônico Auditado
      COALESCE(public._business_is_registration_verified(b.tenant_id, b.id), false) AS is_verified,
      -- Resolução de Plano Efetivo (Plano Comercial)
      COALESCE(effective_plan.plan_code, 'bronze') AS plan_code,
      -- Resolução de Reconhecimentos Institucionais Ativos da Tabela Canônica
      COALESCE(recs.has_pedra, false) AS is_pedra_fundamental,
      COALESCE(recs.has_coluna, false) AS is_founder,
      COALESCE(recs.rec_keys, '{}'::text[]) AS recognitions,
      masonic_link.link_type AS masonic_link_type,
      masonic_link.lodge_name AS masonic_lodge_name
    FROM public.businesses b
    LEFT JOIN LATERAL (
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) sub_status ON true
    LEFT JOIN public.business_locations bl ON bl.tenant_id = b.tenant_id AND bl.business_id = b.id
    LEFT JOIN public.business_categories bc ON bc.tenant_id = b.tenant_id AND bc.business_id = b.id
    LEFT JOIN public.categories c ON c.id = bc.category_id AND c.is_active = true
    LEFT JOIN public.business_benefits ben ON ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
    -- Subquery Lateral de Capa de Mídia Priorizando cover sobre image
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id 
        AND bm.business_id = b.id 
        AND bm.media_type IN ('cover', 'image')
      ORDER BY 
        CASE WHEN bm.media_type = 'cover' THEN 0 ELSE 1 END,
        bm.display_order ASC,
        bm.created_at ASC
      LIMIT 1
    ) media_cover ON true
    -- Subquery Lateral de Plano Comercial
    LEFT JOIN LATERAL (
      SELECT bp.code AS plan_code
      FROM public.subscriptions s
      JOIN public.plan_versions pv ON pv.id = s.plan_version_id
      JOIN public.plans bp ON bp.id = pv.plan_id
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id AND s.status IN ('active', 'trailing', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    ) effective_plan ON true
    -- Subquery Lateral de Reconhecimentos Institucionais
    LEFT JOIN LATERAL (
      SELECT 
        bool_or(br.recognition_key = 'pedra_fundamental') AS has_pedra,
        bool_or(br.recognition_key = 'coluna_de_honra') AS has_coluna,
        array_agg(br.recognition_key) AS rec_keys
      FROM public.business_recognitions br
      WHERE br.tenant_id = b.tenant_id AND br.business_id = b.id AND br.is_active = true
    ) recs ON true
    -- Subquery Lateral de Vínculo Maçônico
    LEFT JOIN LATERAL (
      SELECT ml.link_type, ml.status, o.name AS lodge_name
      FROM public.business_masonic_links ml
      LEFT JOIN public.organizations o ON o.id = ml.organization_id
      WHERE ml.tenant_id = b.tenant_id AND ml.business_id = b.id AND ml.status IN ('verified', 'active', 'approved')
      ORDER BY ml.is_primary DESC, ml.created_at DESC
      LIMIT 1
    ) masonic_link ON true
    WHERE b.tenant_id = v_tenant_id
      -- REGRA TRIPLA DE PUBLICAÇÃO:
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      -- Filtro de Slugs
      AND (
        p_slugs IS NULL 
        OR CARDINALITY(p_slugs) = 0 
        OR lower(b.slug) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_slugs) x))
      )
      -- Filtro por Busca Textual
      AND (
        v_query IS NULL 
        OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
        OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(c.name) LIKE '%' || public._normalize_search(v_query) || '%'
        OR lower(b.slug) = lower(v_query)
        OR lower(b.slug) LIKE '%' || lower(v_query) || '%'
      )
      -- Filtros de Localização
      AND (v_state IS NULL OR lower(bl.state) = lower(v_state))
      AND (v_city IS NULL OR lower(bl.city) = lower(v_city))
      -- Filtros de Categoria
      AND (v_category_slug IS NULL OR c.slug = v_category_slug)
      -- Filtro por Empresa Verificada
      AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
      -- Filtro por Benefícios Fraternos
      AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL)
      -- Filtro por Vínculo Maçônico (Array)
      AND (
        p_relationships IS NULL 
        OR CARDINALITY(p_relationships) = 0
        OR lower(COALESCE(masonic_link.link_type, 'owner')) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_relationships) x))
      )
      -- Filtro por Plano Comercial (Array)
      AND (
        p_plans IS NULL 
        OR CARDINALITY(p_plans) = 0
        OR lower(COALESCE(effective_plan.plan_code, 'bronze')) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_plans) x))
      )
      -- Filtro por Reconhecimentos Institucionais (Array)
      AND (
        p_recognitions IS NULL 
        OR CARDINALITY(p_recognitions) = 0
        OR (
          ('pedra_fundamental' = ANY(p_recognitions) AND COALESCE(recs.has_pedra, false))
          OR ('coluna_de_honra' = ANY(p_recognitions) AND COALESCE(recs.has_coluna, false))
        )
      )
  )
  SELECT COUNT(*) INTO v_total FROM filtered_data;
  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  -- Fetch Items JSON
  WITH filtered_data AS (
    SELECT DISTINCT ON (b.id)
      b.id,
      b.slug,
      b.name,
      left(b.description, 200) AS short_description,
      b.description,
      public._safe_public_url(b.logo_url) AS logo_url,
      public._safe_public_url(media_cover.url) AS cover_url,
      b.is_active,
      b.publication_status,
      bl.city,
      bl.state,
      bl.latitude,
      bl.longitude,
      c.name AS category_name,
      c.slug AS category_slug,
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
      COALESCE(public._business_is_registration_verified(b.tenant_id, b.id), false) AS is_verified,
      COALESCE(effective_plan.plan_code, 'bronze') AS plan_code,
      COALESCE(recs.has_pedra, false) AS is_pedra_fundamental,
      COALESCE(recs.has_coluna, false) AS is_founder,
      COALESCE(recs.rec_keys, '{}'::text[]) AS recognitions,
      masonic_link.link_type AS masonic_link_type,
      masonic_link.lodge_name AS masonic_lodge_name
    FROM public.businesses b
    LEFT JOIN LATERAL (
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) sub_status ON true
    LEFT JOIN public.business_locations bl ON bl.tenant_id = b.tenant_id AND bl.business_id = b.id
    LEFT JOIN public.business_categories bc ON bc.tenant_id = b.tenant_id AND bc.business_id = b.id
    LEFT JOIN public.categories c ON c.id = bc.category_id AND c.is_active = true
    LEFT JOIN public.business_benefits ben ON ben.tenant_id = b.tenant_id AND ben.business_id = b.id AND ben.is_active = true
    LEFT JOIN LATERAL (
      SELECT bm.url
      FROM public.business_media bm
      WHERE bm.tenant_id = b.tenant_id 
        AND bm.business_id = b.id 
        AND bm.media_type IN ('cover', 'image')
      ORDER BY 
        CASE WHEN bm.media_type = 'cover' THEN 0 ELSE 1 END,
        bm.display_order ASC,
        bm.created_at ASC
      LIMIT 1
    ) media_cover ON true
    LEFT JOIN LATERAL (
      SELECT bp.code AS plan_code
      FROM public.subscriptions s
      JOIN public.plan_versions pv ON pv.id = s.plan_version_id
      JOIN public.plans bp ON bp.id = pv.plan_id
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id AND s.status IN ('active', 'trailing', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    ) effective_plan ON true
    LEFT JOIN LATERAL (
      SELECT 
        bool_or(br.recognition_key = 'pedra_fundamental') AS has_pedra,
        bool_or(br.recognition_key = 'coluna_de_honra') AS has_coluna,
        array_agg(br.recognition_key) AS rec_keys
      FROM public.business_recognitions br
      WHERE br.tenant_id = b.tenant_id AND br.business_id = b.id AND br.is_active = true
    ) recs ON true
    LEFT JOIN LATERAL (
      SELECT ml.link_type, ml.status, o.name AS lodge_name
      FROM public.business_masonic_links ml
      LEFT JOIN public.organizations o ON o.id = ml.organization_id
      WHERE ml.tenant_id = b.tenant_id AND ml.business_id = b.id AND ml.status IN ('verified', 'active', 'approved')
      ORDER BY ml.is_primary DESC, ml.created_at DESC
      LIMIT 1
    ) masonic_link ON true
    WHERE b.tenant_id = v_tenant_id
      AND b.is_active = true
      AND b.publication_status = 'published'
      AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      AND (
        p_slugs IS NULL 
        OR CARDINALITY(p_slugs) = 0 
        OR lower(b.slug) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_slugs) x))
      )
      AND (
        v_query IS NULL 
        OR public._normalize_search(b.name) LIKE '%' || public._normalize_search(v_query) || '%' 
        OR public._normalize_search(b.description) LIKE '%' || public._normalize_search(v_query) || '%'
        OR public._normalize_search(c.name) LIKE '%' || public._normalize_search(v_query) || '%'
        OR lower(b.slug) = lower(v_query)
        OR lower(b.slug) LIKE '%' || lower(v_query) || '%'
      )
      AND (v_state IS NULL OR lower(bl.state) = lower(v_state))
      AND (v_city IS NULL OR lower(bl.city) = lower(v_city))
      AND (v_category_slug IS NULL OR c.slug = v_category_slug)
      AND (v_verified IS NOT TRUE OR public._business_is_registration_verified(b.tenant_id, b.id) = true)
      AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL)
      AND (
        p_relationships IS NULL 
        OR CARDINALITY(p_relationships) = 0
        OR lower(COALESCE(masonic_link.link_type, 'owner')) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_relationships) x))
      )
      AND (
        p_plans IS NULL 
        OR CARDINALITY(p_plans) = 0
        OR lower(COALESCE(effective_plan.plan_code, 'bronze')) = ANY(ARRAY(SELECT lower(x) FROM unnest(p_plans) x))
      )
      AND (
        p_recognitions IS NULL 
        OR CARDINALITY(p_recognitions) = 0
        OR (
          ('pedra_fundamental' = ANY(p_recognitions) AND COALESCE(recs.has_pedra, false))
          OR ('coluna_de_honra' = ANY(p_recognitions) AND COALESCE(recs.has_coluna, false))
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
        'distance_km', CASE WHEN distance_km IS NOT NULL THEN ROUND(distance_km::numeric, 1) ELSE NULL END,
        'is_verified', is_verified,
        'effective_plan_code', plan_code,
        'plan_code', plan_code,
        'recognitions', recognitions,
        'is_founder', is_founder,
        'is_pedra_fundamental', is_pedra_fundamental,
        'masonic_connection', (
          CASE 
            WHEN masonic_link_type IS NOT NULL THEN
              jsonb_build_object(
                'type', masonic_link_type,
                'lodge_name', masonic_lodge_name
              )
            ELSE NULL
          END
        )
      ) AS item_json
    FROM filtered_data
    ORDER BY
      CASE WHEN v_sort = 'distance' THEN distance_km END ASC NULLS LAST,
      CASE WHEN v_sort = 'name_asc' THEN name END ASC,
      CASE WHEN v_sort = 'name_desc' THEN name END DESC,
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

GRANT EXECUTE ON FUNCTION public.public_businesses_search(text, text, text[], text, text, text, text, text[], text[], text[], boolean, boolean, numeric, numeric, numeric, text, integer, integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
