-- Contato direto opcional do empresário(a), separado do WhatsApp comercial.
ALTER TABLE public.business_responsibles
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

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
  SELECT name, business_role, community_label, organization, whatsapp, avatar_url
  INTO v_resp
  FROM public.business_responsibles
  WHERE tenant_id = p_tenant_id AND business_id = p_business_id
  LIMIT 1;

  SELECT bml.id, bml.status, bml.verified_at, bml.verified_by, o.name AS organization_name
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
  ELSE
    v_org_name := NULL;
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
    'whatsapp', NULLIF(btrim(v_resp.whatsapp), ''),
    'avatar_url', v_resp.avatar_url
  ));
END;
$$;

ALTER FUNCTION public._public_business_responsible(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._public_business_responsible(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._public_business_responsible(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
