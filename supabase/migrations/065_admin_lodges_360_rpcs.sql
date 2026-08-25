-- Migration 065: Admin Lodges 360 & Data Quality RPCs

-- 1. Ensure organizations table has provenance and completeness helper columns if not present
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS provenance TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS venerable_name TEXT,
  ADD COLUMN IF NOT EXISTS is_venerable_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS emblem_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_schedule TEXT;

-- 2. RPC: Get Admin Lodges List with KPIs and Data Quality Filters
CREATE OR REPLACE FUNCTION public.get_admin_lodges_list(
  p_query TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_potency TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_missing_coords BOOLEAN DEFAULT false,
  p_missing_emblem BOOLEAN DEFAULT false,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 50);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_total INTEGER := 0;
  v_total_pages INTEGER := 0;
  v_items JSONB := '[]'::jsonb;
  v_kpis JSONB;
BEGIN
  -- KPIs Consolidados
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'published', COALESCE(COUNT(*) FILTER (WHERE is_active = true), 0),
    'inactive', COALESCE(COUNT(*) FILTER (WHERE is_active = false), 0),
    'missing_coords', COALESCE(COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL), 0),
    'missing_emblem', COALESCE(COUNT(*) FILTER (WHERE emblem_url IS NULL OR emblem_url = ''), 0),
    'possible_duplicates', 0
  ) INTO v_kpis
  FROM public.organizations;

  WITH filtered AS (
    SELECT
      o.id,
      o.name,
      COALESCE(o.slug, o.id::text) AS slug,
      o.code_number,
      o.potency,
      o.rite,
      o.city,
      o.state,
      o.address,
      o.meeting_schedule,
      o.phone,
      o.email,
      o.emblem_url,
      o.latitude,
      o.longitude,
      o.is_active,
      COALESCE(o.provenance, 'manual') AS provenance,
      o.created_at,
      -- Calculo de Completude Real (%)
      ROUND(
        (
          (CASE WHEN o.name IS NOT NULL AND o.name != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.potency IS NOT NULL AND o.potency != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.meeting_schedule IS NOT NULL AND o.meeting_schedule != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.city IS NOT NULL AND o.city != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.latitude IS NOT NULL AND o.longitude IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN o.emblem_url IS NOT NULL AND o.emblem_url != '' THEN 1 ELSE 0 END) +
          (CASE WHEN o.phone IS NOT NULL OR o.email IS NOT NULL THEN 1 ELSE 0 END)
        )::numeric / 7.0 * 100.0
      ) AS completeness_percent
    FROM public.organizations o
    WHERE (p_query IS NULL OR lower(o.name) LIKE '%' || lower(p_query) || '%' OR lower(o.city) LIKE '%' || lower(p_query) || '%' OR o.code_number::text LIKE '%' || p_query || '%')
      AND (p_state IS NULL OR lower(o.state) = lower(p_state))
      AND (p_potency IS NULL OR lower(o.potency) = lower(p_potency))
      AND (p_status IS NULL OR (p_status = 'published' AND o.is_active = true) OR (p_status = 'inactive' AND o.is_active = false))
      AND (p_missing_coords IS FALSE OR (o.latitude IS NULL OR o.longitude IS NULL))
      AND (p_missing_emblem IS FALSE OR (o.emblem_url IS NULL OR o.emblem_url = ''))
  )
  SELECT COUNT(*) INTO v_total FROM filtered;

  v_total_pages := CEIL(v_total::numeric / v_page_size);

  SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT * FROM filtered
    ORDER BY created_at DESC
    LIMIT v_page_size OFFSET v_offset
  ) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'kpis', v_kpis
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_lodges_list(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO service_role;
