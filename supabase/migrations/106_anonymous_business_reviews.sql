ALTER TABLE public.business_reviews
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;

DROP FUNCTION IF EXISTS public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER);

CREATE FUNCTION public.public_business_reviews(
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
  author_name TEXT,
  author_avatar_url TEXT,
  is_anonymous BOOLEAN,
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
    CASE WHEN br.is_anonymous THEN NULL ELSE NULLIF(trim(p.name), '') END,
    CASE WHEN br.is_anonymous THEN NULL ELSE br.author_avatar_url END,
    br.is_anonymous,
    br.created_at,
    br.id
  FROM public.business_reviews br
  JOIN public.businesses b
    ON b.id = br.business_id AND b.tenant_id = br.tenant_id
  LEFT JOIN public.profiles p ON p.id = br.author_id
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

ALTER FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_business_reviews(TEXT, TEXT, TIMESTAMPTZ, UUID, INTEGER) TO anon, authenticated;
