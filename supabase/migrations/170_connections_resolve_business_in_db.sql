-- 170 - Mural de Conexões: resolver a empresa dentro do banco.
--
-- A leitura pública direta de public.businesses foi removida (migração 040: só dono/gestão leem), então o app
-- não consegue localizar a empresa pelo slug com a sessão do membro ("Empresa não encontrada") nem trazer o nome
-- da empresa na lista "Minhas conexões". As funções abaixo fazem isso no banco, com o mesmo critério da página
-- pública (tenant do domínio, slug sem diferenciar maiúsculas, empresa ativa e publicada).

-- Registrar a conexão informando o slug da empresa.
CREATE OR REPLACE FUNCTION public.register_business_connection_by_slug(
  p_host TEXT,
  p_business_slug TEXT,
  p_type TEXT,
  p_item TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
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

  -- Mesma função e mesmas regras (limites, auto-registro, foto) da migração 168; auth.uid() continua o do membro.
  RETURN public.register_business_connection(v_business_id, p_type, p_item, p_message, p_photo_url);
END;
$$;

REVOKE ALL ON FUNCTION public.register_business_connection_by_slug(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_business_connection_by_slug(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- "Minhas conexões": conexões do membro logado, já com nome e slug da empresa.
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

REVOKE ALL ON FUNCTION public.list_my_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_connections() TO authenticated;

NOTIFY pgrst, 'reload schema';
