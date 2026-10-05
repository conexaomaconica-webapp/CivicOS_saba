-- 169 - Mural de Conexões: curtidas, remoção de foto e feed da página principal.
--
-- Regras:
--  - Ver o mural (e as fotos): todos, inclusive visitantes.
--  - Curtir: somente membro logado, uma curtida por membro por conexão, apenas em conexões CONFIRMADAS;
--    não vale curtir a própria conexão nem conexão da empresa da qual a pessoa faz parte.
--  - Remover a foto: o próprio membro, a gestão da empresa (owner/co_owner/manager) ou o admin do tenant.
--    A conexão continua confirmada; só a foto some do mural.

-- ---------------------------------------------------------------------------
-- 1. Curtidas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connection_likes (
  connection_id UUID NOT NULL REFERENCES public.business_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_connection_likes_user ON public.connection_likes (user_id);

ALTER TABLE public.connection_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Member reads own likes" ON public.connection_likes;
CREATE POLICY "Member reads own likes" ON public.connection_likes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.connection_likes FROM PUBLIC, anon;
GRANT SELECT ON public.connection_likes TO authenticated;
GRANT ALL ON public.connection_likes TO service_role;

CREATE OR REPLACE FUNCTION public.toggle_connection_like(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conn public.business_connections;
  v_liked BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para curtir.';
  END IF;

  SELECT c.* INTO v_conn
  FROM public.business_connections c
  JOIN public.businesses b ON b.id = c.business_id
  WHERE c.id = p_connection_id
    AND c.status = 'confirmada'
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_conn.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conexão não encontrada.';
  END IF;

  IF v_conn.member_user_id = v_user_id OR public.has_business_permission(
       v_conn.tenant_id, v_conn.business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você não pode curtir esta conexão.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.connection_likes WHERE connection_id = v_conn.id AND user_id = v_user_id) THEN
    DELETE FROM public.connection_likes WHERE connection_id = v_conn.id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO public.connection_likes (connection_id, user_id) VALUES (v_conn.id, v_user_id)
    ON CONFLICT DO NOTHING;
    v_liked := true;
  END IF;

  RETURN jsonb_build_object(
    'liked', v_liked,
    'like_count', (SELECT count(*) FROM public.connection_likes WHERE connection_id = v_conn.id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_connection_like(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_connection_like(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Remoção de foto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_connection_photo(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conn public.business_connections;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  SELECT * INTO v_conn FROM public.business_connections WHERE id = p_connection_id FOR UPDATE;
  IF v_conn.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conexão não encontrada.';
  END IF;

  IF NOT (
    v_conn.member_user_id = v_user_id
    OR public.has_tenant_admin_access(v_conn.tenant_id)
    OR public.has_business_permission(v_conn.tenant_id, v_conn.business_id, ARRAY['owner', 'co_owner', 'manager'])
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para remover esta foto.';
  END IF;

  UPDATE public.business_connections
  SET photo_url = NULL, updated_at = now()
  WHERE id = v_conn.id;

  RETURN jsonb_build_object('id', v_conn.id, 'photo_removed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_connection_photo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_connection_photo(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Mural público da empresa, agora com curtidas
-- ---------------------------------------------------------------------------
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
    AND b.slug = p_business_slug
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
        'photo_url', x.photo_url,
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

-- ---------------------------------------------------------------------------
-- 4. Feed da página principal: conexões confirmadas mais recentes, de qualquer empresa publicada
-- ---------------------------------------------------------------------------
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
      'photo_url', x.photo_url,
      'member_first_name', public._connection_member_first_name(x.member_user_id),
      'confirmed_at', x.confirmed_at,
      'business_name', x.business_name,
      'business_slug', x.business_slug,
      'like_count', (SELECT count(*) FROM public.connection_likes l WHERE l.connection_id = x.id),
      'liked_by_me', (v_me IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.connection_likes l WHERE l.connection_id = x.id AND l.user_id = v_me
      ))
    ) ORDER BY (x.photo_url IS NOT NULL) DESC, x.confirmed_at DESC)
    FROM (
      SELECT c.*, b.name AS business_name, b.slug AS business_slug
      FROM public.business_connections c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.tenant_id = v_tenant_id
        AND c.status = 'confirmada'
        AND b.publication_status = 'published'
        AND b.is_active = true
        AND (NOT COALESCE(p_only_with_photo, false) OR c.photo_url IS NOT NULL)
      ORDER BY (c.photo_url IS NOT NULL) DESC, c.confirmed_at DESC
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
