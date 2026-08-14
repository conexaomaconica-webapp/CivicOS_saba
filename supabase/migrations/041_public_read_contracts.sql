-- ============================================================================
-- PROPOSTA 041 - Minimal public read contracts
-- ============================================================================
-- STATUS: proposta para revisao. Nao aplicada ao Supabase remoto nesta fase.
--
-- Todas as RPCs:
--   * resolvem tenant exclusivamente por host verificado;
--   * retornam zero linhas para host/slug/recurso invalido (fail closed);
--   * possuem saida tipada e nao retornam tenant_id, owner_id, CNPJ, razao
--     social, e-mail legado, documentos, notas de verificacao ou settings;
--   * limitam paginacao no banco;
--   * usam SECURITY DEFINER com search_path fixo e grants explicitos.
--
-- Rate limit, cache e protecao volumetrica permanecem obrigatorios na camada
-- Edge/API. O banco limita payload e evita UUID/tenant_id como entrada publica.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Resolucao interna do tenant por host
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._normalize_public_host(p_host TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
SET search_path = ''
AS $$
  WITH raw AS (
    SELECT lower(btrim(p_host)) AS value
  ), without_scheme AS (
    SELECT regexp_replace(value, '^https?://', '', 'i') AS value
    FROM raw
  ), without_trailing_slash AS (
    SELECT regexp_replace(value, '/$', '') AS value
    FROM without_scheme
  ), parsed AS (
    SELECT
      value,
      substring(value FROM ':([0-9]{1,5})$') AS port,
      regexp_replace(value, ':[0-9]{1,5}$', '') AS hostname
    FROM without_trailing_slash
  ), normalized AS (
    SELECT
      value,
      port,
      lower(regexp_replace(rtrim(hostname, '.'), '^www\.', '', 'i')) AS host
    FROM parsed
  )
  SELECT CASE
    WHEN length(host) BETWEEN 1 AND 253
      AND length(value) <= 2048
      AND value !~ '[/@?#[:space:]]'
      AND (port IS NULL OR port::INTEGER BETWEEN 1 AND 65535)
      AND host !~ ':'
      AND host !~ '\.\.'
      AND host ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
    THEN host
    ELSE NULL
  END
  FROM normalized;
$$;

CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
RETURNS NULL ON NULL INPUT
SET search_path = ''
AS $$
  WITH wanted AS (
    SELECT public._normalize_public_host(p_host) AS host
  ), candidates AS (
    SELECT d.tenant_id
    FROM wanted w
    JOIN public.tenant_domains d
      ON lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i')) = w.host
    JOIN public.tenants t ON t.id = d.tenant_id
    WHERE w.host IS NOT NULL
      AND d.is_verified = true
      AND d.ssl_status = 'active'
      AND t.public_access_status = 'enabled'
  )
  SELECT c.tenant_id
  FROM candidates c
  WHERE (SELECT count(*) FROM candidates) = 1
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._safe_public_url(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
SET search_path = ''
AS $$
  SELECT CASE
    WHEN length(p_value) <= 2048
      AND p_value !~ '[[:space:]]'
      AND (
        p_value ~ '^https://'
        OR (left(p_value, 1) = '/' AND left(p_value, 2) <> '//')
      )
    THEN p_value
    ELSE NULL
  END;
$$;

ALTER FUNCTION public._normalize_public_host(TEXT) OWNER TO postgres;
ALTER FUNCTION public._resolve_public_tenant_id(TEXT) OWNER TO postgres;
ALTER FUNCTION public._safe_public_url(TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._normalize_public_host(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._resolve_public_tenant_id(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._safe_public_url(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._normalize_public_host(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public._resolve_public_tenant_id(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public._safe_public_url(TEXT) TO service_role;

-- As RPCs publicas podem existir em ambientes que receberam uma versao
-- intermediaria dos contratos. PostgreSQL nao permite CREATE OR REPLACE quando
-- o row type de parametros OUT muda. Removemos somente as seis assinaturas
-- exatas, sem CASCADE; qualquer dependencia inesperada bloqueia a migration.
DROP FUNCTION IF EXISTS public.public_tenant_branding(TEXT);
DROP FUNCTION IF EXISTS public.public_home_content(TEXT);
DROP FUNCTION IF EXISTS public.public_directory_search(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.public_business_detail(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.public_masonic_lodges(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);

-- ---------------------------------------------------------------------------
-- 2. Branding publico do tenant
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_tenant_branding(p_host TEXT)
RETURNS TABLE (
  tenant_slug TEXT,
  display_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  font_token TEXT,
  radius TEXT,
  density TEXT,
  color_mode TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    t.slug,
    left(COALESCE(NULLIF(t.settings #>> '{branding,appName}', ''), t.name), 64),
    public._safe_public_url(left(NULLIF(t.settings #>> '{branding,logoUrl}', ''), 512)),
    public._safe_public_url(left(NULLIF(t.settings #>> '{branding,faviconUrl}', ''), 512)),
    CASE WHEN (t.settings #>> '{branding,primaryColor}') ~ '^#[0-9A-Fa-f]{6}$'
      THEN lower(t.settings #>> '{branding,primaryColor}') END,
    CASE WHEN (t.settings #>> '{branding,accentColor}') ~ '^#[0-9A-Fa-f]{6}$'
      THEN lower(t.settings #>> '{branding,accentColor}') END,
    CASE
      WHEN (t.settings #>> '{branding,fontFamily}') IN (
        'platform-sans', 'editorial-serif', 'humanist-sans'
      ) THEN t.settings #>> '{branding,fontFamily}'
      ELSE 'platform-sans'
    END,
    CASE WHEN (t.settings #>> '{branding,radius}') IN ('sm', 'md', 'lg', 'xl')
      THEN t.settings #>> '{branding,radius}' END,
    CASE WHEN (t.settings #>> '{branding,density}') IN ('comfortable', 'compact')
      THEN t.settings #>> '{branding,density}' END,
    CASE WHEN (t.settings #>> '{branding,colorMode}') IN ('light', 'dark', 'auto')
      THEN t.settings #>> '{branding,colorMode}' END
  FROM public.tenants t
  WHERE t.id = public._resolve_public_tenant_id(p_host);
$$;

-- ---------------------------------------------------------------------------
-- 3. Conteudo da Home + banners institucionais vigentes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_home_content(p_host TEXT)
RETURNS TABLE (
  tenant_slug TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  primary_cta_label TEXT,
  primary_cta_url TEXT,
  secondary_cta_label TEXT,
  secondary_cta_url TEXT,
  about_title TEXT,
  about_body TEXT,
  banners JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    t.slug,
    h.hero_title,
    h.hero_subtitle,
    public._safe_public_url(h.hero_image_url),
    h.primary_cta_label,
    public._safe_public_url(h.primary_cta_url),
    h.secondary_cta_label,
    public._safe_public_url(h.secondary_cta_url),
    h.about_title,
    h.about_body,
    COALESCE(bn.items, '[]'::jsonb)
  FROM public.tenants t
  JOIN public.tenant_public_home_content h
    ON h.tenant_id = t.id
   AND h.publication_status = 'published'
   AND h.published_at <= statement_timestamp()
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'title', b.title,
        'image_url', public._safe_public_url(b.image_url),
        'target_url', public._safe_public_url(b.target_url),
        'position', b.position
      ) ORDER BY b.start_at DESC, b.id
    ) AS items
    FROM public.banners b
    WHERE b.tenant_id = t.id
      AND b.is_active = true
      AND public._safe_public_url(b.image_url) IS NOT NULL
      AND b.start_at <= statement_timestamp()
      AND (b.end_at IS NULL OR b.end_at > statement_timestamp())
  ) bn ON true
  WHERE t.id = public._resolve_public_tenant_id(p_host);
$$;

-- ---------------------------------------------------------------------------
-- 4. Busca paginada do diretorio (cursor por nome normalizado + UUID)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_directory_search(
  p_host TEXT,
  p_query TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_after_name TEXT DEFAULT NULL,
  p_after_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  business_slug TEXT,
  business_name TEXT,
  description TEXT,
  logo_url TEXT,
  primary_category_slug TEXT,
  primary_category_name TEXT,
  city TEXT,
  state TEXT,
  is_founder BOOLEAN,
  is_verified BOOLEAN,
  effective_plan_code TEXT,
  cursor_name TEXT,
  cursor_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH args AS (
    SELECT
      public._resolve_public_tenant_id(p_host) AS tenant_id,
      NULLIF(btrim(p_query), '') AS query,
      NULLIF(btrim(p_category_slug), '') AS category_slug,
      NULLIF(btrim(p_city), '') AS city,
      upper(NULLIF(btrim(p_state), '')) AS state,
      LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50) AS row_limit
  )
  SELECT
    b.slug,
    b.name,
    left(b.description, 500),
    public._safe_public_url(b.logo_url),
    category.slug,
    category.name,
    location.city,
    location.state,
    public._business_is_founder(b.tenant_id, b.id),
    public._business_is_registration_verified(b.tenant_id, b.id),
    effective_plan.plan_code,
    lower(b.name),
    b.slug
  FROM args a
  JOIN public.businesses b ON b.tenant_id = a.tenant_id
  LEFT JOIN LATERAL (
    SELECT c.slug, c.name
    FROM public.business_categories bc
    JOIN public.categories c ON c.id = bc.category_id
    WHERE bc.tenant_id = b.tenant_id
      AND bc.business_id = b.id
      AND c.is_active = true
      AND (c.tenant_id IS NULL OR c.tenant_id = b.tenant_id)
    ORDER BY bc.is_primary DESC, c.display_order, c.id
    LIMIT 1
  ) category ON true
  LEFT JOIN LATERAL (
    SELECT bl.city, bl.state
    FROM public.business_locations bl
    WHERE bl.tenant_id = b.tenant_id
      AND bl.business_id = b.id
    ORDER BY bl.is_headquarters DESC, bl.id
    LIMIT 1
  ) location ON true
  LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id)
    AS effective_plan ON true
  WHERE b.is_active = true
    AND b.publication_status = 'published'
    AND b.slug IS NOT NULL
    AND CASE
      WHEN a.query IS NULL THEN true
      WHEN length(a.query) <= 128 THEN
        to_tsvector(
          'simple'::regconfig,
          COALESCE(b.name, '') || ' ' || COALESCE(b.description, '')
        ) @@ websearch_to_tsquery('simple'::regconfig, a.query)
      ELSE false
    END
    AND (a.category_slug IS NULL OR (length(a.category_slug) <= 96 AND EXISTS (
      SELECT 1
      FROM public.business_categories bc_filter
      JOIN public.categories c_filter ON c_filter.id = bc_filter.category_id
      WHERE bc_filter.tenant_id = b.tenant_id
        AND bc_filter.business_id = b.id
        AND c_filter.slug = a.category_slug
        AND c_filter.is_active = true
        AND (c_filter.tenant_id IS NULL OR c_filter.tenant_id = b.tenant_id)
    )))
    AND (a.city IS NULL OR (length(a.city) <= 120 AND lower(location.city) = lower(a.city)))
    AND (a.state IS NULL OR (a.state ~ '^[A-Z]{2}$' AND upper(location.state) = a.state))
    AND (
      (p_after_name IS NULL AND p_after_slug IS NULL)
      OR (
        p_after_name IS NOT NULL AND p_after_slug IS NOT NULL
        AND length(p_after_name) <= 160
        AND length(p_after_slug) <= 160
        AND (lower(b.name), b.slug) > (lower(p_after_name), p_after_slug)
      )
    )
  ORDER BY lower(b.name), b.slug
  LIMIT (SELECT row_limit FROM args);
$$;

-- ---------------------------------------------------------------------------
-- 5. Detalhe publico agregado da empresa
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_business_detail(
  p_host TEXT,
  p_business_slug TEXT
)
RETURNS TABLE (
  tenant_slug TEXT,
  business_slug TEXT,
  business_name TEXT,
  description TEXT,
  company_type TEXT,
  logo_url TEXT,
  primary_category_slug TEXT,
  primary_category_name TEXT,
  locations JSONB,
  contacts JSONB,
  business_hours JSONB,
  media JSONB,
  is_founder BOOLEAN,
  is_verified BOOLEAN,
  effective_plan_code TEXT,
  responsible JSONB,
  rating_average NUMERIC,
  rating_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    t.slug,
    b.slug,
    b.name,
    b.description,
    b.company_type,
    public._safe_public_url(b.logo_url),
    category.slug,
    category.name,
    COALESCE(locations.items, '[]'::jsonb),
    COALESCE(contacts.items, '[]'::jsonb),
    COALESCE(hours.items, '[]'::jsonb),
    COALESCE(media_items.items, '[]'::jsonb),
    public._business_is_founder(b.tenant_id, b.id),
    public._business_is_registration_verified(b.tenant_id, b.id),
    effective_plan.plan_code,
    public._public_business_responsible(b.tenant_id, b.id),
    reviews.average_rating,
    COALESCE(reviews.review_count, 0)
  FROM public.businesses b
  JOIN public.tenants t ON t.id = b.tenant_id
  LEFT JOIN LATERAL (
    SELECT c.slug, c.name
    FROM public.business_categories bc
    JOIN public.categories c ON c.id = bc.category_id
    WHERE bc.tenant_id = b.tenant_id
      AND bc.business_id = b.id
      AND c.is_active = true
      AND (c.tenant_id IS NULL OR c.tenant_id = b.tenant_id)
    ORDER BY bc.is_primary DESC, c.display_order, c.id
    LIMIT 1
  ) category ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'title', bl.title,
      'street', bl.street,
      'number', bl.number,
      'complement', bl.complement,
      'neighborhood', bl.neighborhood,
      'city', bl.city,
      'state', bl.state,
      'postal_code', bl.postal_code,
      'country', bl.country,
      'latitude', bl.latitude,
      'longitude', bl.longitude,
      'is_headquarters', bl.is_headquarters
    )) ORDER BY bl.is_headquarters DESC, bl.id) AS items
    FROM public.business_locations bl
    WHERE bl.tenant_id = b.tenant_id AND bl.business_id = b.id
  ) locations ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'type', bc.type,
      'value', bc.value,
      'label', bc.label
    )) ORDER BY bc.type, bc.id) AS items
    FROM public.business_contacts bc
    WHERE bc.tenant_id = b.tenant_id
      AND bc.business_id = b.id
      AND bc.is_public = true
  ) contacts ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'day_of_week', bh.day_of_week,
      'open_time', bh.open_time,
      'close_time', bh.close_time,
      'is_closed', bh.is_closed
    ) ORDER BY bh.day_of_week) AS items
    FROM public.business_hours bh
    WHERE bh.tenant_id = b.tenant_id AND bh.business_id = b.id
  ) hours ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'media_type', bm.media_type,
      'url', public._safe_public_url(bm.url),
      'title', bm.title,
      'display_order', bm.display_order
    )) ORDER BY bm.display_order, bm.id) AS items
    FROM public.business_media bm
    WHERE bm.tenant_id = b.tenant_id
      AND bm.business_id = b.id
      AND bm.media_type IN ('image', 'video')
      AND public._safe_public_url(bm.url) IS NOT NULL
  ) media_items ON true
  LEFT JOIN LATERAL (
    SELECT
      round(avg(br.rating)::numeric, 2) AS average_rating,
      count(*)::bigint AS review_count
    FROM public.business_reviews br
    WHERE br.tenant_id = b.tenant_id
      AND br.business_id = b.id
      AND br.moderation_status = 'published'
  ) reviews ON true
  LEFT JOIN LATERAL public._effective_business_plan(b.tenant_id, b.id)
    AS effective_plan ON true
  WHERE b.tenant_id = public._resolve_public_tenant_id(p_host)
    AND length(p_business_slug) <= 160
    AND p_business_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND b.slug = p_business_slug
    AND b.is_active = true
    AND b.publication_status = 'published'
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 6. Reviews publicadas, sem identificador do autor
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_business_reviews(
  p_host TEXT,
  p_business_slug TEXT,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  review_public_id UUID,
  rating INTEGER,
  comment TEXT,
  published_at TIMESTAMPTZ,
  business_response TEXT,
  responded_at TIMESTAMPTZ,
  cursor_created_at TIMESTAMPTZ,
  cursor_id UUID
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    br.id,
    br.rating,
    br.comment,
    br.moderated_at,
    br.business_response,
    br.responded_at,
    br.created_at,
    br.id
  FROM public.business_reviews br
  JOIN public.businesses b
    ON b.id = br.business_id AND b.tenant_id = br.tenant_id
  WHERE b.tenant_id = public._resolve_public_tenant_id(p_host)
    AND length(p_business_slug) <= 160
    AND p_business_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND b.slug = p_business_slug
    AND b.is_active = true
    AND b.publication_status = 'published'
    AND br.moderation_status = 'published'
    AND (
      (p_before_created_at IS NULL AND p_before_id IS NULL)
      OR (
        p_before_created_at IS NOT NULL AND p_before_id IS NOT NULL
        AND (br.created_at, br.id) < (p_before_created_at, p_before_id)
      )
    )
  ORDER BY br.created_at DESC, br.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- 7. Lojas maconicas publicadas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_masonic_lodges(
  p_host TEXT,
  p_query TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_after_name TEXT DEFAULT NULL,
  p_after_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  lodge_slug TEXT,
  lodge_name TEXT,
  code_number INTEGER,
  potency TEXT,
  rite TEXT,
  foundation_date DATE,
  meeting_schedule TEXT,
  city TEXT,
  state TEXT,
  cursor_name TEXT,
  cursor_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  WITH args AS (
    SELECT
      public._resolve_public_tenant_id(p_host) AS tenant_id,
      NULLIF(btrim(p_query), '') AS query,
      NULLIF(btrim(p_city), '') AS city,
      upper(NULLIF(btrim(p_state), '')) AS state
  )
  SELECT
    o.public_slug,
    o.name,
    o.code_number,
    o.potency,
    o.rite,
    o.foundation_date,
    o.meeting_schedule,
    o.city,
    o.state,
    lower(o.name),
    o.public_slug
  FROM args a
  JOIN public.organizations o ON o.tenant_id = a.tenant_id
  WHERE o.is_active = true
    AND o.publication_status = 'published'
    AND o.public_slug IS NOT NULL
    AND CASE
      WHEN a.query IS NULL THEN true
      WHEN length(a.query) <= 128 THEN
        to_tsvector(
          'simple'::regconfig,
          COALESCE(o.name, '') || ' ' || COALESCE(o.potency, '') || ' ' || COALESCE(o.rite, '')
        ) @@ websearch_to_tsquery('simple'::regconfig, a.query)
      ELSE false
    END
    AND (a.city IS NULL OR (length(a.city) <= 120 AND lower(o.city) = lower(a.city)))
    AND (a.state IS NULL OR (a.state ~ '^[A-Z]{2}$' AND upper(o.state) = a.state))
    AND (
      (p_after_name IS NULL AND p_after_slug IS NULL)
      OR (
        p_after_name IS NOT NULL AND p_after_slug IS NOT NULL
        AND length(p_after_name) <= 160
        AND length(p_after_slug) <= 160
        AND (lower(o.name), o.public_slug) > (lower(p_after_name), p_after_slug)
      )
    )
  ORDER BY lower(o.name), o.public_slug
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- 8. Grants publicos estritos
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.public_tenant_branding(TEXT) OWNER TO postgres;
ALTER FUNCTION public.public_home_content(TEXT) OWNER TO postgres;
ALTER FUNCTION public.public_directory_search(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) OWNER TO postgres;
ALTER FUNCTION public.public_business_detail(TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) OWNER TO postgres;
ALTER FUNCTION public.public_masonic_lodges(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.public_tenant_branding(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_home_content(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_directory_search(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_business_detail(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_masonic_lodges(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.public_tenant_branding(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_home_content(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_directory_search(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_business_detail(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_masonic_lodges(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;

-- PostgREST nao suporta overloads de forma segura para este contrato. Qualquer
-- assinatura adicional com o mesmo nome bloqueia a migration em vez de ficar
-- acessivel por engano.
DO $$
DECLARE
  v_name TEXT;
  v_count INTEGER;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'public_tenant_branding',
    'public_home_content',
    'public_directory_search',
    'public_business_detail',
    'public_business_reviews',
    'public_masonic_lodges'
  ] LOOP
    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_name;

    IF v_count <> 1 THEN
      RAISE EXCEPTION 'PUBLIC_RPC_OVERLOAD_DETECTED: % has % signatures', v_name, v_count;
    END IF;
  END LOOP;
END;
$$;
