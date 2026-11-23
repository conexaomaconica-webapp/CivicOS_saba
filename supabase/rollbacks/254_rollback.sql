-- =============================================================================
-- Rollback 254: Reverte member_connection_blocks e restaura as RPCs das migrations 171, 244 e 245
-- =============================================================================

-- 1. Restaura public_connections_feed (migration 244)
CREATE OR REPLACE FUNCTION public.public_connections_feed(
  p_host TEXT,
  p_limit INTEGER DEFAULT 6,
  p_only_with_photo BOOLEAN DEFAULT false,
  p_one_per_business BOOLEAN DEFAULT false,
  p_prefer_photo BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 24);
  v_me UUID := auth.uid();
  v_prefer_photo BOOLEAN := COALESCE(p_prefer_photo, true);
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', x.id,
      'connection_type', x.connection_type,
      'item_description', x.item_description,
      'message', x.message,
      'photo_url', x.public_photo,
      'member_first_name', public._connection_member_first_name(x.member_user_id),
      'confirmed_at', x.confirmed_at,
      'business_name', x.business_name,
      'business_slug', x.business_slug,
      'like_count', (SELECT count(*) FROM public.connection_likes l WHERE l.connection_id = x.id),
      'liked_by_me', (v_me IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.connection_likes l WHERE l.connection_id = x.id AND l.user_id = v_me
      ))
    ) ORDER BY (v_prefer_photo AND x.public_photo IS NOT NULL) DESC, x.confirmed_at DESC, x.id)
    FROM (
      SELECT r.*
      FROM (
        SELECT c.*, b.name AS business_name, b.slug AS business_slug,
          CASE WHEN c.photo_moderation_status = 'aprovada' THEN c.photo_url ELSE NULL END AS public_photo,
          ROW_NUMBER() OVER (
            PARTITION BY c.business_id
            ORDER BY (v_prefer_photo AND c.photo_moderation_status = 'aprovada' AND c.photo_url IS NOT NULL) DESC, c.confirmed_at DESC, c.id
          ) AS business_rank
        FROM public.business_connections c
        JOIN public.businesses b ON b.id = c.business_id
        WHERE c.tenant_id = v_tenant_id
          AND c.status = 'confirmada'
          AND c.share_on_mural = true
          AND b.publication_status = 'published'
          AND b.is_active = true
          AND (NOT COALESCE(p_only_with_photo, false) OR (c.photo_url IS NOT NULL AND c.photo_moderation_status = 'aprovada'))
      ) r
      WHERE NOT COALESCE(p_one_per_business, false) OR r.business_rank = 1
      ORDER BY (v_prefer_photo AND r.photo_moderation_status = 'aprovada' AND r.photo_url IS NOT NULL) DESC, r.confirmed_at DESC, r.id
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN) TO anon, authenticated;

-- 2. Restaura public_connections_list (migration 245)
CREATE OR REPLACE FUNCTION public.public_connections_list(
  p_host TEXT,
  p_query TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_order TEXT DEFAULT 'recent',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_me UUID := auth.uid();
  v_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 12), 1), 24);
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_query TEXT := NULLIF(public._normalize_search(btrim(left(COALESCE(p_query, ''), 80))), '');
  v_type TEXT := CASE WHEN p_type IN ('compra', 'servico', 'parceria', 'visita') THEN p_type ELSE NULL END;
  v_oldest BOOLEAN := (p_order = 'oldest');
  v_total INTEGER;
  v_pages INTEGER;
  v_items JSONB;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', 1, 'page_size', v_size, 'total_pages', 0);
  END IF;

  SELECT count(*)::INTEGER INTO v_total
  FROM public.business_connections c
  JOIN public.businesses b ON b.id = c.business_id
  WHERE c.tenant_id = v_tenant_id
    AND c.status = 'confirmada'
    AND c.share_on_mural = true
    AND b.publication_status = 'published'
    AND b.is_active = true
    AND (v_type IS NULL OR c.connection_type = v_type)
    AND (v_query IS NULL OR position(v_query IN public._normalize_search(
          COALESCE(b.name, '') || ' ' || COALESCE(c.item_description, '') || ' ' || COALESCE(c.message, ''))) > 0);

  v_pages := CASE WHEN v_total = 0 THEN 0 ELSE ((v_total + v_size - 1) / v_size) END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'connection_type', x.connection_type,
      'item_description', x.item_description,
      'message', x.message,
      'photo_url', x.public_photo,
      'member_first_name', public._connection_member_first_name(x.member_user_id),
      'confirmed_at', x.confirmed_at,
      'business_name', x.business_name,
      'business_slug', x.business_slug,
      'business_logo_url', x.business_logo_url,
      'like_count', (SELECT count(*) FROM public.connection_likes l WHERE l.connection_id = x.id),
      'liked_by_me', (v_me IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.connection_likes l WHERE l.connection_id = x.id AND l.user_id = v_me
      ))
    ) ORDER BY x.sort_rank), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT c.*, b.name AS business_name, b.slug AS business_slug, b.logo_url AS business_logo_url,
      CASE WHEN c.photo_moderation_status = 'aprovada' THEN c.photo_url ELSE NULL END AS public_photo,
      ROW_NUMBER() OVER (
        ORDER BY CASE WHEN v_oldest THEN c.confirmed_at END ASC, CASE WHEN NOT v_oldest THEN c.confirmed_at END DESC, c.id
      ) AS sort_rank
    FROM public.business_connections c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.tenant_id = v_tenant_id
      AND c.status = 'confirmada'
      AND c.share_on_mural = true
      AND b.publication_status = 'published'
      AND b.is_active = true
      AND (v_type IS NULL OR c.connection_type = v_type)
      AND (v_query IS NULL OR position(v_query IN public._normalize_search(
            COALESCE(b.name, '') || ' ' || COALESCE(c.item_description, '') || ' ' || COALESCE(c.message, ''))) > 0)
    ORDER BY CASE WHEN v_oldest THEN c.confirmed_at END ASC, CASE WHEN NOT v_oldest THEN c.confirmed_at END DESC, c.id
    LIMIT v_size OFFSET (v_page - 1) * v_size
  ) x;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size, 'total_pages', v_pages);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_list(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- 3. Restaura public_business_connections (migration 171)
CREATE OR REPLACE FUNCTION public.public_business_connections(
  p_host TEXT,
  p_business_slug TEXT,
  p_limit INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_business_id UUID;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 24);
  v_me UUID := auth.uid();
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('confirmed_count', 0, 'items', '[]'::jsonb);
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(p_business_slug)
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('confirmed_count', 0, 'items', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'confirmed_count', (
      SELECT count(*) FROM public.business_connections c
      WHERE c.business_id = v_business_id AND c.status = 'confirmada'
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', x.id,
        'connection_type', x.connection_type,
        'item_description', x.item_description,
        'message', x.message,
        'photo_url', CASE WHEN x.photo_moderation_status = 'aprovada' THEN x.photo_url ELSE NULL END,
        'member_first_name', public._connection_member_first_name(x.member_user_id),
        'confirmed_at', x.confirmed_at,
        'like_count', (SELECT count(*) FROM public.connection_likes l WHERE l.connection_id = x.id),
        'liked_by_me', (v_me IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.connection_likes l WHERE l.connection_id = x.id AND l.user_id = v_me
        ))
      ) ORDER BY x.confirmed_at DESC)
      FROM (
        SELECT * FROM public.business_connections c
        WHERE c.business_id = v_business_id AND c.status = 'confirmada'
        ORDER BY c.confirmed_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_business_connections(TEXT, TEXT, INTEGER) TO anon, authenticated;

-- 4. Remove RPC e tabela de bloqueios
DROP FUNCTION IF EXISTS public.block_connection_author(UUID, TEXT);
DROP TABLE IF EXISTS public.member_connection_blocks;

NOTIFY pgrst, 'reload schema';
