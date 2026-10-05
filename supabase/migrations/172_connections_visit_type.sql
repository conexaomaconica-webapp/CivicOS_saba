-- 172 - Mural de Conexões: novo tipo "visita" (foto de visita a uma empresa, sem negócio fechado).
--
-- A visita segue o mesmo fluxo (a empresa confirma; a foto passa pela moderação do admin), mas NÃO conta como
-- "negócio confirmado": os contadores de negócios ignoram visitas, e as visitas têm contagem própria.

-- ---------------------------------------------------------------------------
-- 1. Aceitar o tipo "visita"
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.business_connections'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%connection_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.business_connections DROP CONSTRAINT %I', v_name);
  END LOOP;

  ALTER TABLE public.business_connections
    ADD CONSTRAINT business_connections_connection_type_check
    CHECK (connection_type IN ('compra', 'servico', 'parceria', 'visita'));
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Registro aceita "visita" (mesmas regras da migração 168)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_business_connection(
  p_business_id UUID,
  p_type TEXT,
  p_item TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_biz RECORD;
  v_item TEXT := NULLIF(btrim(COALESCE(p_item, '')), '');
  v_message TEXT := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_photo TEXT := NULLIF(btrim(COALESCE(p_photo_url, '')), '');
  v_row public.business_connections;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para registrar uma conexão.';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('compra', 'servico', 'parceria', 'visita') THEN
    RAISE EXCEPTION 'INVALID_TYPE: Tipo de conexão inválido.';
  END IF;

  IF v_item IS NOT NULL AND char_length(v_item) > 160 THEN
    RAISE EXCEPTION 'INVALID_ITEM: Descreva o produto ou serviço em até 160 caracteres.';
  END IF;
  IF v_message IS NOT NULL AND char_length(v_message) > 400 THEN
    RAISE EXCEPTION 'INVALID_MESSAGE: O relato pode ter até 400 caracteres.';
  END IF;

  IF v_photo IS NOT NULL AND v_photo NOT LIKE '%/storage/v1/object/public/connection-photos/' || v_user_id::text || '/%' THEN
    RAISE EXCEPTION 'INVALID_PHOTO: Foto inválida.';
  END IF;

  SELECT b.id, b.tenant_id, b.owner_id, b.name
  INTO v_biz
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_biz.id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa não encontrada ou indisponível.';
  END IF;

  IF v_biz.owner_id = v_user_id OR public.has_business_permission(
       v_biz.tenant_id, v_biz.id,
       ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer']
     ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Você faz parte desta empresa e não pode registrar uma conexão com ela.';
  END IF;

  IF (SELECT count(*) FROM public.business_connections c
      WHERE c.member_user_id = v_user_id AND c.created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: Você já registrou várias conexões hoje. Tente novamente amanhã.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.business_connections c
             WHERE c.member_user_id = v_user_id AND c.business_id = v_biz.id
               AND c.connection_type = p_type AND c.status = 'pendente') THEN
    RAISE EXCEPTION 'DUPLICATE: Você já tem uma conexão deste tipo aguardando confirmação desta empresa.';
  END IF;

  INSERT INTO public.business_connections
    (tenant_id, business_id, member_user_id, connection_type, item_description, message, photo_url)
  VALUES
    (v_biz.tenant_id, v_biz.id, v_user_id, p_type, v_item, v_message, v_photo)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'business_name', v_biz.name,
    'connection_type', v_row.connection_type,
    'status', v_row.status,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Contadores: visita não é "negócio confirmado"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_confirmed_connections_count(p_host TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT count(*)::INTEGER
    FROM public.business_connections c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.tenant_id = v_tenant_id
      AND c.status = 'confirmada'
      AND c.connection_type <> 'visita'
      AND b.publication_status = 'published'
      AND b.is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_confirmed_connections_count(TEXT) TO anon, authenticated;

-- Mural público da empresa: negócios confirmados (sem visitas) + visitas à parte.
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
    RETURN jsonb_build_object('confirmed_count', 0, 'visit_count', 0, 'items', '[]'::jsonb);
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(p_business_slug)
    AND b.publication_status = 'published'
    AND b.is_active = true;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('confirmed_count', 0, 'visit_count', 0, 'items', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'confirmed_count', (
      SELECT count(*) FROM public.business_connections c
      WHERE c.business_id = v_business_id AND c.status = 'confirmada' AND c.connection_type <> 'visita'
    ),
    'visit_count', (
      SELECT count(*) FROM public.business_connections c
      WHERE c.business_id = v_business_id AND c.status = 'confirmada' AND c.connection_type = 'visita'
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

-- Métricas da empresa: negócios confirmados sem visitas; visitas à parte.
CREATE OR REPLACE FUNCTION public.business_connection_metrics(p_business_id UUID)
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
    RAISE EXCEPTION 'FORBIDDEN: Sem permissão para ver as métricas desta empresa.';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', count(*),
      'confirmed', count(*) FILTER (WHERE status = 'confirmada' AND connection_type <> 'visita'),
      'visits', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'visita'),
      'pending', count(*) FILTER (WHERE status = 'pendente'),
      'declined', count(*) FILTER (WHERE status = 'recusada'),
      'confirmed_last_30_days', count(*) FILTER (WHERE status = 'confirmada' AND connection_type <> 'visita' AND confirmed_at > now() - interval '30 days'),
      'with_photo', count(*) FILTER (WHERE status = 'confirmada' AND photo_url IS NOT NULL),
      'by_type', jsonb_build_object(
        'compra', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'compra'),
        'servico', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'servico'),
        'parceria', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'parceria'),
        'visita', count(*) FILTER (WHERE status = 'confirmada' AND connection_type = 'visita')
      ),
      'confirmation_rate', CASE
        WHEN count(*) FILTER (WHERE status IN ('confirmada', 'recusada')) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'confirmada')
                   / count(*) FILTER (WHERE status IN ('confirmada', 'recusada')))
      END,
      'last_confirmed_at', max(confirmed_at)
    )
    FROM public.business_connections
    WHERE business_id = p_business_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.business_connection_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_connection_metrics(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
