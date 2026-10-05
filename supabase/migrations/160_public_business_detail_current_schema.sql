-- 160 - Detalhe público da empresa (/guia/[slug]) no schema atual.
--
-- A RPC public_business_detail (migration 044) referenciava colunas que não existem
-- mais em businesses (is_published, cover_url, street, city, state, zip_code...).
-- Ela falhava sempre, e a página caía em consultas diretas que o visitante anônimo
-- não consegue ler pela RLS. Resultado: 404 para empresas sem fallback e selos
-- (Pedra Fundamental, Coluna de Honra) ocultos.
--
-- Esta versão devolve o payload completo em uma única chamada, com o mesmo formato
-- consumido por toPublicBusinessPresentation. Tenant resolvido pelo host. Sem CNPJ
-- nem dados privados. Localização da sede e contatos públicos.

-- A versão anterior retornava outro tipo; o Postgres exige DROP antes da troca de tipo.
-- A página lê o resultado como array (SETOF), por isso a função devolve zero ou uma linha.
DROP FUNCTION IF EXISTS public.public_business_detail(text, text);

CREATE OR REPLACE FUNCTION public.public_business_detail(
  p_host text,
  p_business_slug text
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_biz public.businesses%ROWTYPE;
  v_category text;
  v_lodge_name text;
  v_link_status text;
  v_pedra boolean;
  v_coluna boolean;
  v_locations jsonb;
  v_contacts jsonb;
  v_media jsonb;
  v_services jsonb;
  v_benefits jsonb;
  v_responsible jsonb;
  v_hq jsonb;
BEGIN
  v_tenant_id := public._resolve_public_tenant_id(p_host);
  IF v_tenant_id IS NULL OR NULLIF(btrim(p_business_slug), '') IS NULL THEN
    RETURN;
  END IF;

  -- Tripla condição: empresa ativa, publicada e com assinatura vigente (ou sem assinatura).
  SELECT b.* INTO v_biz
  FROM public.businesses b
  WHERE b.tenant_id = v_tenant_id
    AND lower(b.slug) = lower(btrim(p_business_slug))
    AND b.is_active = true
    AND b.publication_status = 'published'
  LIMIT 1;

  IF v_biz.id IS NULL THEN
    RETURN;
  END IF;

  IF COALESCE((
    SELECT s.status
    FROM public.subscriptions s
    WHERE s.tenant_id = v_biz.tenant_id AND s.business_id = v_biz.id
    ORDER BY s.created_at DESC
    LIMIT 1
  ), 'active') NOT IN ('active', 'trialing', 'trailing') THEN
    RETURN;
  END IF;

  -- Categoria primária
  SELECT c.name INTO v_category
  FROM public.business_categories bc
  JOIN public.categories c ON c.id = bc.category_id
  WHERE bc.tenant_id = v_biz.tenant_id AND bc.business_id = v_biz.id
  ORDER BY bc.is_primary DESC
  LIMIT 1;

  -- Vínculo maçônico: nome da loja e status
  SELECT o.name, bml.status INTO v_lodge_name, v_link_status
  FROM public.business_masonic_links bml
  LEFT JOIN public.organizations o ON o.id = bml.organization_id AND o.tenant_id = bml.tenant_id
  WHERE bml.tenant_id = v_biz.tenant_id AND bml.business_id = v_biz.id
  ORDER BY bml.is_primary DESC NULLS LAST, bml.created_at DESC
  LIMIT 1;

  -- Selos institucionais ativos (Pedra Fundamental e Coluna de Honra)
  v_pedra := EXISTS (
    SELECT 1 FROM public.business_recognitions r
    WHERE r.tenant_id = v_biz.tenant_id AND r.business_id = v_biz.id
      AND r.recognition_key = 'pedra_fundamental' AND r.is_active = true
  );
  v_coluna := EXISTS (
    SELECT 1 FROM public.business_recognitions r
    WHERE r.tenant_id = v_biz.tenant_id AND r.business_id = v_biz.id
      AND r.recognition_key = 'coluna_de_honra' AND r.is_active = true
  );

  -- Localizações: sede primeiro
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'street', l.street,
      'number', l.number,
      'complement', l.complement,
      'neighborhood', l.neighborhood,
      'city', l.city,
      'state', l.state,
      'postal_code', l.postal_code,
      'latitude', l.latitude,
      'longitude', l.longitude,
      'is_headquarters', l.is_headquarters
    ) ORDER BY l.is_headquarters DESC, l.created_at ASC), '[]'::jsonb)
  INTO v_locations
  FROM public.business_locations l
  WHERE l.tenant_id = v_biz.tenant_id AND l.business_id = v_biz.id;

  SELECT COALESCE(
    (SELECT jsonb_build_object(
        'street', l.street,
        'number', l.number,
        'neighborhood', l.neighborhood,
        'city', l.city,
        'state', l.state,
        'postal_code', l.postal_code
      )
     FROM public.business_locations l
     WHERE l.tenant_id = v_biz.tenant_id AND l.business_id = v_biz.id
     ORDER BY l.is_headquarters DESC, l.created_at ASC
     LIMIT 1),
    '{}'::jsonb
  ) INTO v_hq;

  -- Contatos públicos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'type', c.type,
      'value', c.value,
      'label', c.label
    ) ORDER BY c.created_at ASC), '[]'::jsonb)
  INTO v_contacts
  FROM public.business_contacts c
  WHERE c.tenant_id = v_biz.tenant_id AND c.business_id = v_biz.id AND c.is_public = true;

  -- Galeria
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'media_type', m.media_type,
      'url', m.url,
      'title', m.title,
      'display_order', m.display_order
    ) ORDER BY m.display_order ASC, m.created_at ASC), '[]'::jsonb)
  INTO v_media
  FROM public.business_media m
  WHERE m.tenant_id = v_biz.tenant_id AND m.business_id = v_biz.id;

  -- Serviços ativos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'description', s.description,
      'icon_name', s.icon_name,
      'price_info', s.price_info
    ) ORDER BY s.display_order ASC, s.created_at ASC), '[]'::jsonb)
  INTO v_services
  FROM public.business_services s
  WHERE s.tenant_id = v_biz.tenant_id AND s.business_id = v_biz.id AND s.is_active = true;

  -- Benefícios ativos e vigentes
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', bf.id,
      'title', bf.title,
      'description', bf.description,
      'benefit_type', bf.benefit_type,
      'discount_percentage', bf.discount_percentage,
      'discount_code', bf.discount_code,
      'badge_text', bf.badge_text,
      'valid_until', bf.valid_until
    ) ORDER BY bf.display_order ASC, bf.created_at ASC), '[]'::jsonb)
  INTO v_benefits
  FROM public.business_benefits bf
  WHERE bf.tenant_id = v_biz.tenant_id AND bf.business_id = v_biz.id
    AND bf.is_active = true
    AND (bf.valid_from IS NULL OR bf.valid_from <= now())
    AND (bf.valid_until IS NULL OR bf.valid_until > now());

  -- Responsável (dados públicos apenas)
  SELECT jsonb_build_object(
      'name', r.name,
      'business_role', COALESCE(r.business_role, 'Proprietário'),
      'community_label', COALESCE(r.community_label, 'Ir.''.'),
      'organization', COALESCE(r.organization, v_lodge_name),
      'avatar_url', r.avatar_url
    )
  INTO v_responsible
  FROM public.business_responsibles r
  WHERE r.tenant_id = v_biz.tenant_id AND r.business_id = v_biz.id
  LIMIT 1;

  RETURN QUERY SELECT jsonb_build_object(
    'business_id', v_biz.id,
    'business_slug', v_biz.slug,
    'business_name', v_biz.name,
    'primary_category_name', COALESCE(v_category, v_biz.category, 'Empresa Maçônica'),
    'description', v_biz.description,
    'effective_plan_code', COALESCE(v_biz.plan_tier, 'ouro'),
    'logo_url', v_biz.logo_url,
    'is_verified', COALESCE(v_link_status IN ('approved', 'active', 'verified'), false),
    'is_founder', v_coluna,
    'is_pedra_fundamental', v_pedra,
    'is_coluna_honra', v_coluna,
    'lodge_name', v_lodge_name,
    'city', v_hq ->> 'city',
    'state', v_hq ->> 'state',
    'address', NULLIF(btrim(COALESCE(v_hq ->> 'street', '')
                || CASE WHEN v_hq ->> 'number' IS NOT NULL THEN ', ' || (v_hq ->> 'number') ELSE '' END), ''),
    'contacts', v_contacts,
    'locations', v_locations,
    'media', v_media,
    'services', v_services,
    'benefits', v_benefits,
    'responsible', v_responsible,
    'business_hours', '[]'::jsonb,
    'rating_average', NULL,
    'rating_count', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_business_detail(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_business_detail(text, text) TO anon, authenticated, service_role;
