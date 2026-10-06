-- 187 - Favoritos do membro persistidos na conta (business_favorites).
--
-- Até aqui os favoritos viviam só no navegador (localStorage). Estas funções gravam por usuário, resolvendo a
-- empresa pelo host + slug (mesmo critério da página pública). Usuário anônimo continua usando só o localStorage;
-- ao entrar, o app envia os favoritos locais (sync) e passa a usar a lista da conta.
-- SECURITY DEFINER porque membros não leem public.businesses diretamente; auth.uid() limita tudo ao próprio usuário.

CREATE OR REPLACE FUNCTION public.my_favorite_slugs(p_host TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN COALESCE((
    SELECT array_agg(b.slug ORDER BY f.created_at DESC)
    FROM public.business_favorites f
    JOIN public.businesses b ON b.id = f.business_id
    WHERE f.user_id = auth.uid()
      AND f.tenant_id = v_tenant_id
      AND b.publication_status = 'published'
      AND b.is_active = true
  ), ARRAY[]::TEXT[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_favorite(p_host TEXT, p_slug TEXT, p_favorite BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_business_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Entre na sua conta para salvar favoritos.';
  END IF;
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(COALESCE(p_slug, '')), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(btrim(p_slug))
    AND b.publication_status = 'published'
    AND b.is_active = true
  LIMIT 1;
  IF v_business_id IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(p_favorite, true) THEN
    INSERT INTO public.business_favorites (tenant_id, business_id, user_id)
    VALUES (v_tenant_id, v_business_id, auth.uid())
    ON CONFLICT (business_id, user_id) DO NOTHING;
  ELSE
    DELETE FROM public.business_favorites WHERE business_id = v_business_id AND user_id = auth.uid();
  END IF;
  RETURN true;
END;
$$;

-- Mescla os favoritos locais do navegador com os da conta e devolve a lista final (mais recentes primeiro).
CREATE OR REPLACE FUNCTION public.sync_my_favorites(p_host TEXT, p_slugs TEXT[])
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  INSERT INTO public.business_favorites (tenant_id, business_id, user_id)
  SELECT v_tenant_id, b.id, auth.uid()
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = ANY (SELECT lower(btrim(s)) FROM unnest((COALESCE(p_slugs, ARRAY[]::TEXT[]))[1:200]) AS s)
    AND b.publication_status = 'published'
    AND b.is_active = true
  ON CONFLICT (business_id, user_id) DO NOTHING;

  RETURN public.my_favorite_slugs(p_host);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_my_favorites(p_host TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NOT NULL THEN
    DELETE FROM public.business_favorites WHERE user_id = auth.uid() AND tenant_id = v_tenant_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.my_favorite_slugs(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_favorite(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_my_favorites(TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_my_favorites(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_favorite_slugs(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_favorite(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_favorites(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_my_favorites(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
