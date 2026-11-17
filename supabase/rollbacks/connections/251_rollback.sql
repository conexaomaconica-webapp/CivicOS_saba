-- ROLLBACK da migration 251: volta à função da migration 184 (admin/master volta a ser bloqueado em todas as empresas).
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

NOTIFY pgrst, 'reload schema';
