-- ROLLBACK da migration 244: volta à função de 3 argumentos da migration 184 (comportamento anterior).
DROP FUNCTION IF EXISTS public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.public_connections_feed(
  p_host TEXT,
  p_limit INTEGER DEFAULT 6,
  p_only_with_photo BOOLEAN DEFAULT false
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
    ) ORDER BY (x.public_photo IS NOT NULL) DESC, x.confirmed_at DESC)
    FROM (
      SELECT c.*, b.name AS business_name, b.slug AS business_slug,
        CASE WHEN c.photo_moderation_status = 'aprovada' THEN c.photo_url ELSE NULL END AS public_photo
      FROM public.business_connections c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.tenant_id = v_tenant_id
        AND c.status = 'confirmada'
        AND c.share_on_mural = true
        AND b.publication_status = 'published'
        AND b.is_active = true
        AND (NOT COALESCE(p_only_with_photo, false) OR (c.photo_url IS NOT NULL AND c.photo_moderation_status = 'aprovada'))
      ORDER BY (c.photo_moderation_status = 'aprovada' AND c.photo_url IS NOT NULL) DESC, c.confirmed_at DESC
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
