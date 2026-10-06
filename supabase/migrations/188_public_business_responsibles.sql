-- 188 - Responsável e loja maçônica dos cards da listagem do Guia.
--
-- A busca pública (public_businesses_search) não devolve o responsável nem a loja; a página da empresa mostra
-- esses dados (public_business_detail). Esta função devolve, em lote e só com dados já públicos, o responsável
-- (nome, tratamento, loja) das empresas listadas, indexado pelo slug. Uma chamada por página de resultados.

CREATE OR REPLACE FUNCTION public.public_business_responsibles(p_host TEXT, p_slugs TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR p_slugs IS NULL OR cardinality(p_slugs) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_object_agg(x.slug, x.info)
    FROM (
      SELECT
        b.slug,
        jsonb_build_object(
          'name', r.name,
          'community_label', COALESCE(r.community_label, 'Ir.''.'),
          'organization', COALESCE(r.organization, lodge.name)
        ) AS info
      FROM public.businesses b
      LEFT JOIN LATERAL (
        SELECT br.name, br.community_label, br.organization
        FROM public.business_responsibles br
        WHERE br.tenant_id = b.tenant_id AND br.business_id = b.id
        LIMIT 1
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT o.name
        FROM public.business_masonic_links bml
        JOIN public.organizations o ON o.id = bml.organization_id AND o.tenant_id = bml.tenant_id
        WHERE bml.tenant_id = b.tenant_id AND bml.business_id = b.id
        ORDER BY bml.is_primary DESC NULLS LAST, bml.created_at DESC
        LIMIT 1
      ) lodge ON true
      WHERE b.tenant_id = v_tenant_id
        AND lower(b.slug) = ANY (SELECT lower(btrim(s)) FROM unnest((p_slugs)[1:100]) AS s)
        AND b.publication_status = 'published'
        AND b.is_active = true
        AND (r.name IS NOT NULL OR lodge.name IS NOT NULL)
    ) x
  ), '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.public_business_responsibles(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_business_responsibles(TEXT, TEXT[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
