-- ============================================================================
-- MIGRATION 079: CORREÇÃO DE RLS E RPCS DA BUSCA PÚBLICA DE LOJAS
-- ============================================================================

-- 1. Eliminar Recursão Infinita (42P17) na Policy de Read de Organizations
DROP POLICY IF EXISTS "Public can view active published organizations" ON public.organizations;
CREATE POLICY "Public can view active published organizations"
  ON public.organizations
  FOR SELECT
  USING (
    is_active = true
    AND is_published = true
  );

-- Ajustar a policy de Admin para não disparar subconsulta circular em SELECT público
DROP POLICY IF EXISTS "organization_admin can manage own organization" ON public.organizations;
CREATE POLICY "organization_admin can manage own organization"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organizations.tenant_id
        AND op.organization_id = organizations.id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- 2. Corrigir RPC public_lodges_search (2F005: Adicionar RETURN jsonb_build_object)
CREATE OR REPLACE FUNCTION public.public_lodges_search(
  p_host text,
  p_query text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_potency text DEFAULT NULL,
  p_rite text DEFAULT NULL,
  p_meeting_day text DEFAULT NULL,
  p_user_lat numeric DEFAULT NULL,
  p_user_lng numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL,
  p_sort text DEFAULT 'name',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_query TEXT;
  v_state TEXT;
  v_city TEXT;
  v_potency TEXT;
  v_rite TEXT;
  v_meeting_day TEXT;
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
  v_potency := NULLIF(btrim(p_potency), '');
  v_rite := NULLIF(btrim(p_rite), '');
  v_meeting_day := NULLIF(lower(btrim(p_meeting_day)), '');
  v_sort := COALESCE(lower(btrim(p_sort)), 'name');
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 50);
  v_offset := (v_page - 1) * v_page_size;

  WITH lodge_base AS (
    SELECT DISTINCT ON (o.id)
      o.id,
      COALESCE(o.slug, regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')) AS slug,
      o.name,
      o.code_number,
      COALESCE(p.name, o.potency) AS potency_name,
      COALESCE(p.abbreviation, o.potency) AS potency_abbreviation,
      p.slug AS potency_slug,
      COALESCE(r.name, o.rite) AS rite_name,
      r.slug AS rite_slug,
      o.city,
      o.state,
      o.address,
      o.latitude,
      o.longitude,
      o.logo_url,
      o.cover_url,
      o.foundation_date,
      CASE WHEN o.show_worshipful_master = true THEN o.worshipful_master_name ELSE NULL END AS worshipful_master_name,
      o.show_worshipful_master,
      o.show_address,
      o.is_featured
    FROM public.organizations o
    LEFT JOIN public.masonic_potencies p ON p.id = o.potency_id
    LEFT JOIN public.masonic_rites r ON r.id = o.rite_id
    LEFT JOIN public.organization_meetings om ON om.organization_id = o.id AND om.tenant_id = o.tenant_id
    WHERE o.tenant_id = v_tenant_id
      AND o.is_active = true
      AND o.is_published = true
      AND (
        v_query IS NULL
        OR public._normalize_search(o.name) LIKE '%' || public._normalize_search(v_query) || '%'
        OR (o.code_number IS NOT NULL AND o.code_number::text LIKE '%' || v_query || '%')
        OR public._normalize_search(COALESCE(o.city, '')) LIKE '%' || public._normalize_search(v_query) || '%'
      )
      AND (v_state IS NULL OR lower(o.state) = lower(v_state))
      AND (v_city IS NULL OR lower(o.city) = lower(v_city))
      AND (v_potency IS NULL OR lower(p.slug) = lower(v_potency) OR lower(p.abbreviation) = lower(v_potency) OR lower(o.potency) = lower(v_potency))
      AND (v_rite IS NULL OR lower(r.slug) = lower(v_rite) OR lower(r.name) LIKE '%' || lower(v_rite) || '%')
      AND (v_meeting_day IS NULL OR lower(om.meeting_day) = v_meeting_day)
  ),
  total_count AS (
    SELECT COUNT(*) AS total_rows FROM lodge_base
  ),
  paginated_items AS (
    SELECT 
      jsonb_build_object(
        'id', id,
        'slug', slug,
        'name', name,
        'code_number', code_number,
        'potency', potency_abbreviation,
        'potency_name', potency_name,
        'rite', rite_name,
        'city', city,
        'state', state,
        'address', CASE WHEN show_address = true THEN address ELSE NULL END,
        'latitude', latitude,
        'longitude', longitude,
        'logo_url', logo_url,
        'cover_url', cover_url,
        'worshipful_master_name', worshipful_master_name,
        'is_featured', is_featured
      ) AS item_json
    FROM lodge_base
    ORDER BY is_featured DESC, name ASC
    LIMIT v_page_size OFFSET v_offset
  )
  SELECT 
    (SELECT total_rows FROM total_count),
    COALESCE(jsonb_agg(item_json), '[]'::jsonb)
  INTO v_total, v_items
  FROM paginated_items;

  v_total := COALESCE(v_total, 0);
  v_total_pages := CEIL(v_total::NUMERIC / GREATEST(v_page_size, 1)::NUMERIC);

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'has_next_page', v_page < v_total_pages,
    'has_previous_page', v_page > 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lodges_search(text, text, text, text, text, text, text, numeric, numeric, numeric, text, integer, integer) TO anon, authenticated;

-- 3. Padronização Canônica: Alias de compatibilidade para public_organizations_search
CREATE OR REPLACE FUNCTION public.public_organizations_search(
  p_host text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_potency text DEFAULT NULL,
  p_rite text DEFAULT NULL,
  p_meeting_day text DEFAULT NULL,
  p_sort text DEFAULT 'name',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.public_lodges_search(
    p_host := p_host,
    p_query := p_query,
    p_state := p_state,
    p_city := p_city,
    p_potency := p_potency,
    p_rite := p_rite,
    p_meeting_day := p_meeting_day,
    p_sort := p_sort,
    p_page := p_page,
    p_page_size := p_page_size
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_organizations_search(text, text, text, text, text, text, text, text, integer, integer) TO anon, authenticated;
