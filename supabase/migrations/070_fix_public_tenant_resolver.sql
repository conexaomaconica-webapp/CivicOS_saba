-- Migration 070: Fix Public Tenant Resolver Fallback
-- Permite que _resolve_public_tenant_id resolva o tenant padrão quando executado em localhost/preview/dev
-- sem quebrar a resolução estrita quando d.domain estiver registrado.

CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_host TEXT;
  v_tenant_id UUID;
BEGIN
  v_host := public._normalize_public_host(p_host);

  -- 1. Tentar encontrar por domain cadastrado e verificado em tenant_domains
  IF v_host IS NOT NULL THEN
    SELECT d.tenant_id INTO v_tenant_id
    FROM public.tenant_domains d
    JOIN public.tenants t ON t.id = d.tenant_id
    WHERE lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i')) = v_host
      AND d.is_verified = true
      AND d.ssl_status = 'active'
      AND t.public_access_status = 'enabled'
    LIMIT 1;
  END IF;

  -- 2. Fallback para o tenant ativo principal se host for localhost / IP / preview não cadastrado
  IF v_tenant_id IS NULL THEN
    SELECT t.id INTO v_tenant_id
    FROM public.tenants t
    WHERE t.id = '00000000-0000-0000-0000-000000000010'
      OR t.public_access_status = 'enabled'
    ORDER BY (t.id = '00000000-0000-0000-0000-000000000010') DESC, t.created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._resolve_public_tenant_id(TEXT) TO anon, authenticated, service_role;
