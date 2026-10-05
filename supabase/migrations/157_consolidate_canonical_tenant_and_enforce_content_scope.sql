-- 157 - Resolvedor estrito de tenant por domínio e remoção das compatibilidades
-- de leitura pública que misturavam dois tenants.
--
-- Premissa: a Conexão Maçônica opera no tenant 00000000-0000-0000-0000-000000000000,
-- que é o tenant canônico do domínio conexaomaconica.com.br. O tenant
-- 00000000-0000-0000-0000-000000000010 é de teste e não é consolidado aqui.
-- Esta migration não move dados.

-- 1. Resolvedor administrativo/operacional: aceita somente domínio verificado,
--    com SSL ativo e tenant com acesso público habilitado. Não tem fallback.
CREATE OR REPLACE FUNCTION public._resolve_verified_tenant_domain(p_host text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT d.tenant_id
  FROM public.tenant_domains d
  JOIN public.tenants t ON t.id = d.tenant_id
  WHERE lower(regexp_replace(rtrim(btrim(d.domain), '.'), '^www\.', '', 'i'))
        = public._normalize_public_host(p_host)
    AND d.is_verified = true
    AND d.ssl_status = 'active'
    AND t.public_access_status = 'enabled'
  ORDER BY d.is_primary DESC, d.created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._resolve_verified_tenant_domain(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._resolve_verified_tenant_domain(text)
  TO anon, authenticated, service_role;

-- 2. Leituras públicas: remove a compatibilidade "tenant do domínio OU tenant global".
--    Cada RPC passa a consultar somente o tenant resolvido pelo domínio.
--    Falha explicitamente se a compatibilidade permanecer após a troca.
DO $$
DECLARE
  v_name text;
  v_oid oid;
  v_def text;
  v_new text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['public_businesses_search', 'public_lodges_search', 'public_lodge_detail']
  LOOP
    SELECT p.oid INTO v_oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_name
    ORDER BY p.oid DESC
    LIMIT 1;

    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'RPC public.% não encontrada', v_name;
    END IF;

    v_def := pg_get_functiondef(v_oid);

    IF position('00000000-0000-0000-0000-000000000000' IN v_def) = 0 THEN
      CONTINUE;
    END IF;

    v_new := replace(
      v_def,
      'IN (v_tenant_id, ''00000000-0000-0000-0000-000000000000''::uuid)',
      '= v_tenant_id'
    );

    IF position('00000000-0000-0000-0000-000000000000' IN v_new) > 0 THEN
      RAISE EXCEPTION 'Compatibilidade de tenant ainda presente em public.%', v_name;
    END IF;

    EXECUTE v_new;
  END LOOP;
END;
$$;
