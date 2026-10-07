-- 197 - Funções públicas de SEO (sitemap, páginas de cidade/categoria, SEO personalizado e redirect de slug).
--
-- O visitante anônimo (e o Googlebot) NÃO pode ler a tabela businesses diretamente: os dados públicos só saem por funções
-- SECURITY DEFINER, como public_business_detail. As três funções abaixo seguem o mesmo padrão e as mesmas condições de
-- publicação (tenant do domínio, empresa ativa, publicada e com assinatura vigente ou ainda sem assinatura).
-- Nenhuma delas devolve dado privado: só nome, slug, categoria, descrição, logo, cidade/UF e os campos de SEO.

-- 1) Lista pública das empresas publicadas, para sitemap e páginas de cidade/categoria.
CREATE OR REPLACE FUNCTION public.public_seo_directory(p_host text)
RETURNS TABLE (
  slug text,
  name text,
  category text,
  description text,
  logo_url text,
  updated_at timestamptz,
  seo_indexable boolean,
  city text,
  state text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.slug::text,
    b.name::text,
    COALESCE(pc.name, b.category)::text,
    b.description::text,
    b.logo_url::text,
    b.updated_at,
    b.seo_indexable,
    loc.city::text,
    loc.state::text
  FROM public.businesses b
  LEFT JOIN LATERAL (
    SELECT c.name
    FROM public.business_categories bc
    JOIN public.categories c ON c.id = bc.category_id
    WHERE bc.tenant_id = b.tenant_id AND bc.business_id = b.id
    ORDER BY bc.is_primary DESC
    LIMIT 1
  ) pc ON true
  LEFT JOIN LATERAL (
    SELECT l.city, l.state
    FROM public.business_locations l
    WHERE l.business_id = b.id
    ORDER BY l.is_headquarters DESC NULLS LAST, l.created_at
    LIMIT 1
  ) loc ON true
  WHERE b.tenant_id = v_tenant_id
    AND b.is_active = true
    AND b.publication_status = 'published'
    AND b.slug IS NOT NULL
    AND COALESCE((
      SELECT s.status
      FROM public.subscriptions s
      WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ), 'active') IN ('active', 'trialing', 'trailing')
  ORDER BY b.slug
  LIMIT 20000;
END;
$$;

-- 2) Campos de SEO personalizados de uma empresa publicada (título, descrição, imagem, indexável).
CREATE OR REPLACE FUNCTION public.public_business_seo_overrides(p_host text, p_slug text)
RETURNS TABLE (
  seo_title text,
  seo_description text,
  seo_og_image_url text,
  seo_indexable boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(p_slug), '') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.seo_title::text, b.seo_description::text, b.seo_og_image_url::text, b.seo_indexable
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(btrim(p_slug))
    AND b.is_active = true
    AND b.publication_status = 'published'
  LIMIT 1;
END;
$$;

-- 3) Slug atual de uma empresa que mudou de endereço (para o redirect permanente). Vazio se não houve mudança.
CREATE OR REPLACE FUNCTION public.public_business_slug_redirect(p_host text, p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_current text;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(p_slug), '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT b.slug INTO v_current
  FROM public.business_slug_history h
  JOIN public.businesses b ON b.id = h.business_id
  WHERE h.tenant_id = v_tenant_id
    AND lower(h.old_slug) = lower(btrim(p_slug))
    AND b.tenant_id = v_tenant_id
    AND b.is_active = true
    AND b.publication_status = 'published'
    AND b.slug IS NOT NULL
  LIMIT 1;

  RETURN v_current;
END;
$$;

REVOKE ALL ON FUNCTION public.public_seo_directory(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_business_seo_overrides(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_business_slug_redirect(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_seo_directory(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_business_seo_overrides(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_business_slug_redirect(text, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
