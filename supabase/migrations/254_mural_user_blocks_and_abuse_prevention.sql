-- =============================================================================
-- Migration 254: Mural de Conexões — Bloqueio de Autores e Prevenção de Abuso (Apple Guideline 1.2)
-- =============================================================================
-- NOTA DE SEGURANÇA (Gate iOS-2A):
-- Compatível com as migrations 171 (business_connections + connection_reports),
-- 244 (public_connections_feed de 5 argumentos) e 245 (public_connections_list).
-- NÃO aplicada remotamente no Gate iOS-1 / iOS-2A.
-- =============================================================================

-- 1. Tabela de bloqueio de autores do Mural por membro autenticado
CREATE TABLE IF NOT EXISTS public.member_connection_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_connection_id UUID REFERENCES public.business_connections(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'outro'
    CHECK (reason IN ('foto_inadequada', 'informacao_falsa', 'ofensivo', 'outro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_member_connection_blocks UNIQUE (blocker_user_id, blocked_user_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_member_connection_blocks_blocker
  ON public.member_connection_blocks(blocker_user_id);

CREATE INDEX IF NOT EXISTS idx_member_connection_blocks_blocked
  ON public.member_connection_blocks(blocked_user_id);

ALTER TABLE public.member_connection_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.member_connection_blocks FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.member_connection_blocks TO authenticated;
GRANT ALL ON public.member_connection_blocks TO service_role;

DROP POLICY IF EXISTS "member_connection_blocks_select_own" ON public.member_connection_blocks;
CREATE POLICY "member_connection_blocks_select_own"
  ON public.member_connection_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_user_id = auth.uid());

DROP POLICY IF EXISTS "member_connection_blocks_insert_own" ON public.member_connection_blocks;
CREATE POLICY "member_connection_blocks_insert_own"
  ON public.member_connection_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_user_id = auth.uid() AND blocker_user_id <> blocked_user_id);

DROP POLICY IF EXISTS "member_connection_blocks_delete_own" ON public.member_connection_blocks;
CREATE POLICY "member_connection_blocks_delete_own"
  ON public.member_connection_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_user_id = auth.uid());

-- 2. RPC segura para bloquear o autor de uma publicação do Mural sem expor member_user_id no frontend
--    e notificar automaticamente a fila administrativa de moderação (connection_reports).
CREATE OR REPLACE FUNCTION public.block_connection_author(
  p_connection_id UUID,
  p_reason TEXT DEFAULT 'outro'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_conn public.business_connections;
  v_clean_reason TEXT := COALESCE(NULLIF(btrim(p_reason), ''), 'outro');
BEGIN
  IF v_blocker_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'AUTH_REQUIRED',
      'error', 'Sessão autenticada necessária para sincronizar bloqueio na conta.'
    );
  END IF;

  IF v_clean_reason NOT IN ('foto_inadequada', 'informacao_falsa', 'ofensivo', 'outro') THEN
    v_clean_reason := 'outro';
  END IF;

  SELECT *
    INTO v_conn
  FROM public.business_connections c
  WHERE c.id = p_connection_id
    AND c.status = 'confirmada';

  IF v_conn.id IS NULL OR v_conn.member_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'error', 'Publicação não encontrada.'
    );
  END IF;

  IF v_conn.member_user_id = v_blocker_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SELF_BLOCK_NOT_ALLOWED',
      'error', 'Não é possível bloquear o próprio perfil.'
    );
  END IF;

  INSERT INTO public.member_connection_blocks (
    blocker_user_id,
    blocked_user_id,
    source_connection_id,
    reason
  )
  VALUES (
    v_blocker_id,
    v_conn.member_user_id,
    v_conn.id,
    v_clean_reason
  )
  ON CONFLICT (blocker_user_id, blocked_user_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        source_connection_id = COALESCE(EXCLUDED.source_connection_id, public.member_connection_blocks.source_connection_id);

  -- Registra também na fila administrativa de moderação (migration 171) para análise em até 24h (Guideline 1.2)
  INSERT INTO public.connection_reports (
    connection_id,
    reporter_user_id,
    reason,
    details
  )
  VALUES (
    v_conn.id,
    v_blocker_id,
    v_clean_reason,
    'Autor bloqueado pelo usuário via moderação do aplicativo.'
  )
  ON CONFLICT (connection_id, reporter_user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'blocked', true,
    'connection_id', v_conn.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.block_connection_author(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_connection_author(UUID, TEXT) TO authenticated;

-- 3. Atualiza public_connections_feed (assinatura de 5 parâmetros da migration 244)
--    para excluir autores bloqueados pelo usuário autenticado (v_me).
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
          AND (
            v_me IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.member_connection_blocks mb
              WHERE mb.blocker_user_id = v_me
                AND mb.blocked_user_id = c.member_user_id
            )
          )
      ) r
      WHERE NOT COALESCE(p_one_per_business, false) OR r.business_rank = 1
      ORDER BY (v_prefer_photo AND r.photo_moderation_status = 'aprovada' AND r.photo_url IS NOT NULL) DESC, r.confirmed_at DESC, r.id
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_feed(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN) TO anon, authenticated;

-- 4. Atualiza public_connections_list (migration 245) para excluir autores bloqueados por v_me
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
          COALESCE(b.name, '') || ' ' || COALESCE(c.item_description, '') || ' ' || COALESCE(c.message, ''))) > 0)
    AND (
      v_me IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.member_connection_blocks mb
        WHERE mb.blocker_user_id = v_me
          AND mb.blocked_user_id = c.member_user_id
      )
    );

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
      AND (
        v_me IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.member_connection_blocks mb
          WHERE mb.blocker_user_id = v_me
            AND mb.blocked_user_id = c.member_user_id
        )
      )
    ORDER BY CASE WHEN v_oldest THEN c.confirmed_at END ASC, CASE WHEN NOT v_oldest THEN c.confirmed_at END DESC, c.id
    LIMIT v_size OFFSET (v_page - 1) * v_size
  ) x;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size, 'total_pages', v_pages);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_connections_list(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- 5. Atualiza public_business_connections (migration 171) para excluir autores bloqueados por v_me
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
      WHERE c.business_id = v_business_id
        AND c.status = 'confirmada'
        AND (
          v_me IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM public.member_connection_blocks mb
            WHERE mb.blocker_user_id = v_me
              AND mb.blocked_user_id = c.member_user_id
          )
        )
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
        WHERE c.business_id = v_business_id
          AND c.status = 'confirmada'
          AND (
            v_me IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.member_connection_blocks mb
              WHERE mb.blocker_user_id = v_me
                AND mb.blocked_user_id = c.member_user_id
            )
          )
        ORDER BY c.confirmed_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_business_connections(TEXT, TEXT, INTEGER) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
