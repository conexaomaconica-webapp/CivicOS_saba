-- 171 - Mural de Conexões: moderação de fotos pelo admin da plataforma, denúncias e remoção.
--
-- Modelo de duas camadas:
--  1. A EMPRESA confirma o atendimento (já existe): sem isso nada é público.
--  2. O ADMIN DA PLATAFORMA aprova a FOTO: a conexão pode aparecer sem a imagem; a foto só vai a público depois de
--     aprovada. Texto não passa por fila; qualquer item pode ser denunciado e removido pelo admin depois.
--
-- A moderação é por foto (photo_moderation_status). Quem moderou, quando e por quê ficam na própria linha.

-- ---------------------------------------------------------------------------
-- 1. Colunas de moderação
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_connections
  ADD COLUMN IF NOT EXISTS photo_moderation_status TEXT NOT NULL DEFAULT 'nao_requerida'
    CHECK (photo_moderation_status IN ('nao_requerida', 'pendente', 'aprovada', 'rejeitada')),
  ADD COLUMN IF NOT EXISTS photo_moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT CHECK (moderation_note IS NULL OR char_length(moderation_note) <= 300);

-- Fotos já existentes (se houver) passam pela análise.
UPDATE public.business_connections
SET photo_moderation_status = 'pendente'
WHERE photo_url IS NOT NULL AND photo_moderation_status = 'nao_requerida';

-- Toda foto nova ou trocada entra como "pendente"; sem foto, não há o que moderar.
CREATE OR REPLACE FUNCTION public._connection_photo_moderation_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.photo_url IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.photo_url IS DISTINCT FROM OLD.photo_url) THEN
    NEW.photo_moderation_status := 'pendente';
    NEW.photo_moderated_by := NULL;
    NEW.photo_moderated_at := NULL;
  ELSIF NEW.photo_url IS NULL AND NEW.photo_moderation_status IN ('pendente', 'aprovada') THEN
    NEW.photo_moderation_status := 'nao_requerida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_connection_photo_moderation ON public.business_connections;
CREATE TRIGGER trg_connection_photo_moderation
  BEFORE INSERT OR UPDATE OF photo_url ON public.business_connections
  FOR EACH ROW EXECUTE FUNCTION public._connection_photo_moderation_trigger();

CREATE INDEX IF NOT EXISTS idx_business_connections_photo_moderation
  ON public.business_connections (photo_moderation_status) WHERE photo_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Denúncias
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.business_connections(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('foto_inadequada', 'informacao_falsa', 'ofensivo', 'outro')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 300),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_connection_reports_open ON public.connection_reports (status, created_at DESC);

ALTER TABLE public.connection_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connection_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.connection_reports TO service_role;

CREATE OR REPLACE FUNCTION public.report_connection(
  p_connection_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
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
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para denunciar.';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('foto_inadequada', 'informacao_falsa', 'ofensivo', 'outro') THEN
    RAISE EXCEPTION 'INVALID_REASON: Motivo inválido.';
  END IF;

  SELECT * INTO v_conn FROM public.business_connections WHERE id = p_connection_id AND status = 'confirmada';
  IF v_conn.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conexão não encontrada.';
  END IF;

  INSERT INTO public.connection_reports (connection_id, reporter_user_id, reason, details)
  VALUES (v_conn.id, v_user_id, p_reason, NULLIF(btrim(COALESCE(p_details, '')), ''))
  ON CONFLICT (connection_id, reporter_user_id) DO NOTHING;

  RETURN jsonb_build_object('reported', true);
END;
$$;

REVOKE ALL ON FUNCTION public.report_connection(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_connection(UUID, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fila e decisões do admin da plataforma
-- ---------------------------------------------------------------------------
-- p_filter: 'fotos_pendentes' (padrão) | 'denuncias' (conexões com denúncia aberta)
CREATE OR REPLACE FUNCTION public.admin_list_connection_moderation(p_filter TEXT DEFAULT 'fotos_pendentes')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', x.id,
      'business_id', x.business_id,
      'business_name', x.business_name,
      'business_slug', x.business_slug,
      'member_name', public._mask_user_display_name(x.member_user_id),
      'connection_type', x.connection_type,
      'item_description', x.item_description,
      'message', x.message,
      'photo_url', x.photo_url,
      'status', x.status,
      'photo_moderation_status', x.photo_moderation_status,
      'created_at', x.created_at,
      'confirmed_at', x.confirmed_at,
      'open_reports', x.open_reports,
      'report_reasons', x.report_reasons
    ) ORDER BY x.open_reports DESC, x.created_at ASC)
    FROM (
      SELECT c.*, b.name AS business_name, b.slug AS business_slug,
        (SELECT count(*) FROM public.connection_reports r WHERE r.connection_id = c.id AND r.status = 'aberta') AS open_reports,
        COALESCE((SELECT jsonb_agg(DISTINCT r.reason) FROM public.connection_reports r WHERE r.connection_id = c.id AND r.status = 'aberta'), '[]'::jsonb) AS report_reasons
      FROM public.business_connections c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE public.has_tenant_admin_access(c.tenant_id)
        AND (
          (COALESCE(p_filter, 'fotos_pendentes') = 'fotos_pendentes'
            AND c.photo_url IS NOT NULL AND c.photo_moderation_status = 'pendente')
          OR (p_filter = 'denuncias'
            AND EXISTS (SELECT 1 FROM public.connection_reports r WHERE r.connection_id = c.id AND r.status = 'aberta'))
        )
      ORDER BY c.created_at ASC
      LIMIT 200
    ) x
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_connection_moderation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_connection_moderation(TEXT) TO authenticated;

-- Aprovar ou rejeitar a foto. Rejeitar apaga a imagem da conexão (a conexão confirmada continua, sem foto).
CREATE OR REPLACE FUNCTION public.admin_moderate_connection_photo(
  p_connection_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
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
  IF p_decision IS NULL OR p_decision NOT IN ('aprovar', 'rejeitar') THEN
    RAISE EXCEPTION 'INVALID_DECISION: Decisão inválida.';
  END IF;

  SELECT * INTO v_conn FROM public.business_connections WHERE id = p_connection_id FOR UPDATE;
  IF v_conn.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conexão não encontrada.';
  END IF;
  IF NOT public.has_tenant_admin_access(v_conn.tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas a administração da plataforma modera fotos.';
  END IF;
  IF v_conn.photo_url IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATUS: Esta conexão não tem foto.';
  END IF;

  IF p_decision = 'aprovar' THEN
    UPDATE public.business_connections
    SET photo_moderation_status = 'aprovada', photo_moderated_by = v_user_id, photo_moderated_at = now(),
        moderation_note = NULLIF(btrim(COALESCE(p_note, '')), ''), updated_at = now()
    WHERE id = v_conn.id;
  ELSE
    UPDATE public.business_connections
    SET photo_url = NULL, photo_moderation_status = 'rejeitada', photo_moderated_by = v_user_id, photo_moderated_at = now(),
        moderation_note = NULLIF(btrim(COALESCE(p_note, '')), ''), updated_at = now()
    WHERE id = v_conn.id;
  END IF;

  -- Decidir resolve as denúncias abertas desta conexão.
  UPDATE public.connection_reports SET status = 'resolvida' WHERE connection_id = v_conn.id AND status = 'aberta';

  RETURN jsonb_build_object('id', v_conn.id, 'decision', p_decision);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_connection_photo(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_connection_photo(UUID, TEXT, TEXT) TO authenticated;

-- Remover a conexão inteira do mural (denúncia procedente). Não apaga o registro, só o tira de circulação.
CREATE OR REPLACE FUNCTION public.admin_remove_connection(p_connection_id UUID, p_note TEXT DEFAULT NULL)
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
  IF NOT public.has_tenant_admin_access(v_conn.tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas a administração da plataforma remove conexões.';
  END IF;

  UPDATE public.business_connections
  SET status = 'removida', photo_url = NULL, photo_moderated_by = v_user_id, photo_moderated_at = now(),
      moderation_note = NULLIF(btrim(COALESCE(p_note, '')), ''), updated_at = now()
  WHERE id = v_conn.id;

  UPDATE public.connection_reports SET status = 'resolvida' WHERE connection_id = v_conn.id AND status = 'aberta';

  RETURN jsonb_build_object('id', v_conn.id, 'status', 'removida');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_connection(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_connection(UUID, TEXT) TO authenticated;

-- Admin descarta denúncias sem remover nada.
CREATE OR REPLACE FUNCTION public.admin_dismiss_connection_reports(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  SELECT tenant_id INTO v_tenant_id FROM public.business_connections WHERE id = p_connection_id;
  IF v_tenant_id IS NULL OR NOT public.has_tenant_admin_access(v_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas a administração da plataforma trata denúncias.';
  END IF;
  UPDATE public.connection_reports SET status = 'resolvida' WHERE connection_id = p_connection_id AND status = 'aberta';
  RETURN jsonb_build_object('id', p_connection_id, 'dismissed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dismiss_connection_reports(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_connection_reports(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Leituras públicas: foto só aparece depois de aprovada
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

-- ---------------------------------------------------------------------------
-- 5. Listas do membro e da empresa passam a informar o estado da foto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_connections()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', x.id,
      'connection_type', x.connection_type,
      'item_description', x.item_description,
      'photo_url', x.photo_url,
      'photo_moderation_status', x.photo_moderation_status,
      'status', x.status,
      'created_at', x.created_at,
      'confirmed_at', x.confirmed_at,
      'business_name', x.business_name,
      'business_slug', x.business_slug
    ) ORDER BY x.created_at DESC)
    FROM (
      SELECT c.*, b.name AS business_name, b.slug AS business_slug
      FROM public.business_connections c
      JOIN public.businesses b ON b.id = c.business_id
      WHERE c.member_user_id = auth.uid()
      ORDER BY c.created_at DESC
      LIMIT 100
    ) x
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_business_connections(
  p_business_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  SELECT b.tenant_id INTO v_tenant_id FROM public.businesses b WHERE b.id = p_business_id;
  IF v_tenant_id IS NULL OR NOT public.has_business_permission(
       v_tenant_id, p_business_id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as conexões desta empresa.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'connection_type', c.connection_type,
      'item_description', c.item_description,
      'message', c.message,
      'photo_url', c.photo_url,
      'photo_moderation_status', c.photo_moderation_status,
      'status', c.status,
      'member_name', public._mask_user_display_name(c.member_user_id),
      'created_at', c.created_at,
      'confirmed_at', c.confirmed_at
    ) ORDER BY (c.status = 'pendente') DESC, c.created_at DESC)
    FROM (
      SELECT * FROM public.business_connections
      WHERE business_id = p_business_id
        AND (p_status IS NULL OR status = p_status)
        AND status <> 'removida'
      ORDER BY created_at DESC
      LIMIT 200
    ) c
  ), '[]'::jsonb);
END;
$$;

NOTIFY pgrst, 'reload schema';
