-- 184 - Mural integrado ao registro: o membro escolhe se a conexão aparece publicamente no Mural.
--
-- share_on_mural = true  -> após a confirmação da empresa, a conexão (com relato e foto aprovada) aparece no Mural.
-- share_on_mural = false -> o registro vale para métricas, dashboard e funil, mas NÃO aparece publicamente.
-- Conexões já existentes ficam como true (comportamento atual preservado); novos registros nascem false.
-- Os contadores públicos agregados (confirmed_count/visit_count) continuam contando tudo: não expõem identidade.
-- Depende de 171, 172 e 179. As assinaturas da 179 são substituídas (novo parâmetro p_share_on_mural, DEFAULT false).

ALTER TABLE public.business_connections ADD COLUMN IF NOT EXISTS share_on_mural BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.business_connections ALTER COLUMN share_on_mural SET DEFAULT false;

DROP FUNCTION IF EXISTS public.register_business_connection_by_slug(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_business_connection(
  p_business_id UUID,
  p_type TEXT,
  p_item TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_value_range TEXT DEFAULT NULL,
  p_share_on_mural BOOLEAN DEFAULT false
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
  v_origin TEXT := NULLIF(btrim(COALESCE(p_origin, '')), '');
  v_value TEXT := NULLIF(btrim(COALESCE(p_value_range, '')), '');
  v_share BOOLEAN := COALESCE(p_share_on_mural, false);
  v_row public.business_connections;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para registrar uma conexão.';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('compra', 'servico', 'parceria', 'visita') THEN
    RAISE EXCEPTION 'INVALID_TYPE: Tipo de conexão inválido.';
  END IF;

  IF v_origin IS NOT NULL AND v_origin NOT IN (
       'busca', 'oferta', 'indicacao', 'evento', 'compartilhamento', 'qr_empresa', 'ja_conhecia', 'outro') THEN
    RAISE EXCEPTION 'INVALID_ORIGIN: Origem da conexão inválida.';
  END IF;
  IF v_value IS NOT NULL AND v_value NOT IN (
       'ate_250', '251_500', '501_1000', '1001_5000', 'acima_5000', 'nao_informar') THEN
    RAISE EXCEPTION 'INVALID_VALUE: Faixa de valor inválida.';
  END IF;
  -- Sem consentimento para o Mural, a foto não é guardada (ela só serve ao Mural).
  IF NOT v_share THEN
    v_photo := NULL;
  END IF;
  -- Visita não é negócio: não guarda valor.
  IF p_type = 'visita' THEN
    v_value := NULL;
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
    (tenant_id, business_id, member_user_id, connection_type, item_description, message, photo_url, origin, value_range, share_on_mural)
  VALUES
    (v_biz.tenant_id, v_biz.id, v_user_id, p_type, v_item, v_message, v_photo, v_origin, v_value, v_share)
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

REVOKE ALL ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_business_connection_by_slug(
  p_host TEXT,
  p_business_slug TEXT,
  p_type TEXT,
  p_item TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_value_range TEXT DEFAULT NULL,
  p_share_on_mural BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_business_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para registrar uma conexão.';
  END IF;

  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(COALESCE(p_business_slug, '')), '') IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa não encontrada ou indisponível.';
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(btrim(p_business_slug))
    AND b.is_active = true
    AND b.publication_status = 'published'
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa não encontrada ou indisponível.';
  END IF;

  RETURN public.register_business_connection(
    v_business_id, p_type, p_item, p_message, p_photo_url, p_origin, p_value_range, p_share_on_mural
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_business_connection_by_slug(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection_by_slug(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;


-- Mural público da empresa e feed global: só conexões que o membro autorizou.
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
        WHERE c.business_id = v_business_id AND c.status = 'confirmada' AND c.share_on_mural = true
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
