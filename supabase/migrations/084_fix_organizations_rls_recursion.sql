-- Migration 084: Fix Organizations RLS Infinite Recursion (42P17), Restrict Grants & Redefine Public Business Responsible Projection

-- 1. Helper SECURITY DEFINER para verificar se o usuário autenticado é admin da organização (NÃO acessível por anon)
CREATE OR REPLACE FUNCTION public.is_current_user_organization_admin(
  p_tenant_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_organization_id IS NULL THEN
    RETURN false;
  END IF;

  -- Privilégio total para Tenant Admin / Master
  IF public.has_tenant_admin_access(p_tenant_id) THEN
    RETURN true;
  END IF;

  -- Consulta direta a organization_people sob SECURITY DEFINER usando a coluna real status = 'active'
  RETURN EXISTS (
    SELECT 1 FROM public.organization_people op
    WHERE op.tenant_id = p_tenant_id
      AND op.organization_id = p_organization_id
      AND op.user_id = auth.uid()
      AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente', 'secretario')
      AND op.status = 'active'
  );
END;
$$;

ALTER FUNCTION public.is_current_user_organization_admin(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_current_user_organization_admin(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_organization_admin(UUID, UUID) TO authenticated, service_role;

-- 2. Helper SECURITY DEFINER para leitura pública de organização ativa e publicada (acessível por anon, authenticated, service_role)
CREATE OR REPLACE FUNCTION public.is_organization_active_published(
  p_tenant_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.tenant_id = p_tenant_id
      AND o.id = p_organization_id
      AND o.is_active = true
      AND o.is_published = true
  );
$$;

ALTER FUNCTION public.is_organization_active_published(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_organization_active_published(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_organization_active_published(UUID, UUID) TO anon, authenticated, service_role;

-- 3. Recriação das políticas RLS em public.organizations sem dependências circulares
DROP POLICY IF EXISTS "organization_admin can manage own organization" ON public.organizations;
CREATE POLICY "organization_admin can manage own organization"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_current_user_organization_admin(tenant_id, id))
  WITH CHECK (public.is_current_user_organization_admin(tenant_id, id));

-- 4. Recriação das políticas RLS em public.organization_people sem dependências circulares
DROP POLICY IF EXISTS "Public can view active organization people" ON public.organization_people;
CREATE POLICY "Public can view active organization people"
  ON public.organization_people FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND role_in_org IN ('veneravel', 'secretario', 'chanceler', 'tesoureiro')
    AND public.is_organization_active_published(tenant_id, organization_id)
  );

DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage people" ON public.organization_people;
CREATE POLICY "tenant_admin and organization_admin can manage people"
  ON public.organization_people FOR ALL TO authenticated
  USING (public.is_current_user_organization_admin(tenant_id, organization_id))
  WITH CHECK (public.is_current_user_organization_admin(tenant_id, organization_id));

-- 5. Atualização da policy pública em public.business_masonic_links para aceitar apenas vínculos com status institucional aprovado/ativo
DROP POLICY IF EXISTS "Public can view approved active links of published businesses" ON public.business_masonic_links;
CREATE POLICY "Public can view approved active links of published businesses"
  ON public.business_masonic_links FOR SELECT TO anon, authenticated
  USING (
    status IN ('approved', 'active')
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_masonic_links.business_id
        AND b.tenant_id = business_masonic_links.tenant_id
        AND b.is_active = true
        AND b.publication_status = 'published'
    )
  );

-- 6. Redefinição Canônica da função public._public_business_responsible
-- Prioridade estrita: Se houver vínculo maçônico aprovado/verificado com organização ativa e publicada, a Loja institucional PREVALECE e atribui community_verified = true.
-- Caso contrário, utiliza o texto cadastral de business_responsibles com community_verified = false.
CREATE OR REPLACE FUNCTION public._public_business_responsible(
  p_tenant_id UUID,
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_resp RECORD;
  v_masonic RECORD;
  v_org_name TEXT;
  v_community_verified BOOLEAN := false;
BEGIN
  -- Buscar responsável cadastral
  SELECT 
    name,
    business_role,
    community_label,
    organization,
    avatar_url
  INTO v_resp
  FROM public.business_responsibles
  WHERE tenant_id = p_tenant_id AND business_id = p_business_id
  LIMIT 1;

  -- Buscar vínculo maçônico institucional elegível (status IN ('approved', 'active'), organização ativa e publicada, verificação auditada)
  SELECT 
    bml.id,
    bml.status,
    bml.verified_at,
    bml.verified_by,
    o.name AS organization_name
  INTO v_masonic
  FROM public.business_masonic_links bml
  JOIN public.organizations o 
    ON o.id = bml.organization_id 
   AND o.tenant_id = bml.tenant_id
   AND o.is_active = true 
   AND o.is_published = true
  WHERE bml.tenant_id = p_tenant_id 
    AND bml.business_id = p_business_id
    AND bml.status IN ('approved', 'active')
    AND bml.verified_at IS NOT NULL
    AND bml.verified_by IS NOT NULL
  ORDER BY bml.is_primary DESC, bml.created_at DESC
  LIMIT 1;

  IF v_masonic.organization_name IS NOT NULL THEN
    v_org_name := v_masonic.organization_name;
    v_community_verified := true;
  ELSIF v_resp.organization IS NOT NULL AND btrim(v_resp.organization) <> '' THEN
    v_org_name := btrim(v_resp.organization);
    v_community_verified := false;
  ELSE
    v_org_name := NULL;
    v_community_verified := false;
  END IF;

  IF v_resp.name IS NULL AND v_org_name IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'name', COALESCE(v_resp.name, 'Anunciante Titular'),
    'business_role', COALESCE(v_resp.business_role, 'Proprietário'),
    'community_label', COALESCE(v_resp.community_label, 'Ir.''.'),
    'organization', v_org_name,
    'community_verified', v_community_verified,
    'avatar_url', v_resp.avatar_url
  ));
END;
$$;

ALTER FUNCTION public._public_business_responsible(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._public_business_responsible(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._public_business_responsible(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
