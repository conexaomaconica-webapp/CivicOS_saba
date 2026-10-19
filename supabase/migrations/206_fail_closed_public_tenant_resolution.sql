-- 206 - Resolução pública de tenant fail-closed e search_path confiável
-- Homologação local. Não aplicar remotamente sem revisão e aprovação.

CREATE OR REPLACE FUNCTION public._resolve_public_tenant_id(p_host TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
RETURNS NULL ON NULL INPUT
SET search_path = pg_catalog, pg_temp
AS $$
  WITH wanted AS (
    SELECT public._normalize_public_host(p_host) AS host
  ), candidates AS (
    SELECT d.tenant_id
    FROM wanted w
    JOIN public.tenant_domains d
      ON lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\\.', '', 'i')) = w.host
    JOIN public.tenants t ON t.id = d.tenant_id
    WHERE w.host IS NOT NULL
      AND d.is_verified = true
      AND d.ssl_status = 'active'
      AND t.public_access_status = 'enabled'
  )
  SELECT c.tenant_id
  FROM candidates c
  WHERE (SELECT count(*) FROM candidates) = 1
  LIMIT 1;
$$;

ALTER FUNCTION public._resolve_public_tenant_id(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._resolve_public_tenant_id(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._resolve_public_tenant_id(TEXT) TO anon, authenticated, service_role;

-- A RPC mantém a assinatura e o retorno JSONB, mas não pesquisa objetos via
-- search_path mutável. Todas as relações da implementação são qualificadas.
ALTER FUNCTION public.public_business_detail(TEXT, TEXT)
  SET search_path = pg_catalog, pg_temp;
