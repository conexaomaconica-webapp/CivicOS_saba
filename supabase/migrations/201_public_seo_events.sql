-- 201 - Lista pública de eventos publicados para o sitemap (SEO).
--
-- O visitante anônimo (e o Googlebot) não lê a tabela platform_events diretamente: os eventos públicos saem por
-- funções SECURITY DEFINER, como get_platform_event_by_slug. Esta função segue o mesmo padrão da 197 e só devolve
-- dado público: slug, data do evento e última atualização de eventos PUBLICADOS do tenant do domínio.

CREATE OR REPLACE FUNCTION public.public_seo_events(p_host text)
RETURNS TABLE (
  slug text,
  updated_at timestamptz,
  event_date date
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
  SELECT e.slug::text, e.updated_at, e.event_date
  FROM public.platform_events e
  WHERE e.tenant_id = v_tenant_id
    AND e.status = 'published'
  ORDER BY e.event_date DESC
  LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.public_seo_events(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_seo_events(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
