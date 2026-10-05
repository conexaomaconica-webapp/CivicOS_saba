-- 167 - Detalhe da loja: Venerável e endereço marcados como reservados passam a ser vistos por membros logados.
--
-- Antes, public_lodge_detail devolvia NULL para venerável/endereço quando show_worshipful_master / show_address
-- eram falsos, para todo mundo, e a página dizia "restrita a membros autorizados" sem que nenhum membro
-- conseguisse ver. Agora, com sessão ativa (auth.uid() não nulo, ou seja, qualquer membro cadastrado), esses dois
-- campos são devolvidos; visitantes sem login continuam sem eles.
--
-- Contatos e reuniões continuam seguindo is_public (não são liberados por login).
-- Mesma assinatura, mesmo escopo de tenant (= v_tenant_id) e mesmos campos da migração 151.

CREATE OR REPLACE FUNCTION public.public_lodge_detail(
  p_host text,
  p_lodge_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_lodge JSONB;
  v_slug_key TEXT;
  v_is_member BOOLEAN := (auth.uid() IS NOT NULL);
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(p_lodge_slug), '') IS NULL THEN
    RETURN NULL;
  END IF;

  v_slug_key := regexp_replace(public._normalize_search(p_lodge_slug), '[^a-z0-9]', '', 'g');

  SELECT jsonb_build_object(
    'id', o.id,
    'slug', COALESCE(o.slug, regexp_replace(public._normalize_search(o.name), '[^a-z0-9]+', '-', 'g')),
    'name', o.name,
    'code_number', o.code_number,
    'potency', COALESCE(p.abbreviation, o.potency),
    'potency_name', COALESCE(p.name, o.potency),
    'rite', COALESCE(r.name, o.rite),
    'foundation_date', o.foundation_date,
    'city', o.city,
    'state', o.state,
    'cep', o.cep,
    'address', CASE WHEN o.show_address = true OR v_is_member THEN o.address ELSE NULL END,
    'latitude', o.latitude,
    'longitude', o.longitude,
    'logo_url', o.logo_url,
    'cover_url', o.cover_url,
    'worshipful_master_name', CASE WHEN o.show_worshipful_master = true OR v_is_member THEN o.worshipful_master_name ELSE NULL END,
    'show_worshipful_master', o.show_worshipful_master,
    'show_address', o.show_address,
    'contacts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', c.id, 'type', c.type, 'value', c.value, 'label', c.label) ORDER BY c.sort_order, c.created_at), '[]'::jsonb) FROM public.organization_contacts c WHERE c.tenant_id = o.tenant_id AND c.organization_id = o.id AND c.is_public = true),
    'meetings', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'day', m.meeting_day, 'time', m.meeting_time, 'label', m.label) ORDER BY m.sort_order, m.created_at), '[]'::jsonb) FROM public.organization_meetings m WHERE m.tenant_id = o.tenant_id AND m.organization_id = o.id AND m.is_public = true),
    'gallery', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', med.id, 'url', med.url, 'alt', med.alt, 'type', med.type) ORDER BY med.sort_order, med.created_at), '[]'::jsonb) FROM public.organization_media med WHERE med.tenant_id = o.tenant_id AND med.organization_id = o.id)
  ) INTO v_lodge
  FROM public.organizations o
  LEFT JOIN public.masonic_potencies p ON p.id = o.potency_id
  LEFT JOIN public.masonic_rites r ON r.id = o.rite_id
  WHERE o.tenant_id = v_tenant_id
    AND o.is_active = true
    AND o.is_published = true
    AND (
      lower(o.slug) = lower(p_lodge_slug)
      OR regexp_replace(public._normalize_search(COALESCE(o.slug, '')), '[^a-z0-9]', '', 'g') = v_slug_key
      OR regexp_replace(public._normalize_search(o.name), '[^a-z0-9]', '', 'g') = v_slug_key
      OR o.id::text = p_lodge_slug
    )
  ORDER BY CASE WHEN lower(o.slug) = lower(p_lodge_slug) THEN 0 ELSE 1 END, o.created_at
  LIMIT 1;

  RETURN v_lodge;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lodge_detail(text, text) TO anon, authenticated, service_role;
