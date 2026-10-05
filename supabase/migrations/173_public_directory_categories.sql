-- 173 - Categorias do filtro do guia: todas as que têm empresas publicadas.
--
-- O filtro "Todas as Categorias" usava as categorias EM DESTAQUE da página principal (public_directory_home_data),
-- por isso só aparecia parte delas. Esta função devolve toda categoria ativa que tenha ao menos uma empresa
-- visível ao público, com a mesma "tripla condição" usada para as cidades disponíveis: empresa ativa, publicada e
-- sem assinatura em atraso/cancelada/suspensa. Retorna também a quantidade de empresas de cada categoria.

CREATE OR REPLACE FUNCTION public.public_directory_categories(p_host TEXT)
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
  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'slug', x.slug,
        'name', x.name,
        'icon_name', x.icon,
        'business_count', x.business_count
      )
      ORDER BY public._normalize_search(x.name)
    )
    FROM (
      SELECT c.id, c.slug, c.name, c.icon, count(DISTINCT b.id) AS business_count
      FROM public.categories c
      JOIN public.business_categories bc ON bc.category_id = c.id
      JOIN public.businesses b ON b.id = bc.business_id AND b.tenant_id = bc.tenant_id
      LEFT JOIN LATERAL (
        SELECT s.status
        FROM public.subscriptions s
        WHERE s.tenant_id = b.tenant_id AND s.business_id = b.id
        ORDER BY s.created_at DESC
        LIMIT 1
      ) sub_status ON true
      WHERE c.is_active = true
        AND b.tenant_id = v_tenant_id
        AND b.is_active = true
        AND b.publication_status = 'published'
        AND COALESCE(sub_status.status, 'active') NOT IN ('past_due', 'canceled', 'unpaid', 'pending', 'suspended')
      GROUP BY c.id, c.slug, c.name, c.icon
    ) x
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_directory_categories(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
