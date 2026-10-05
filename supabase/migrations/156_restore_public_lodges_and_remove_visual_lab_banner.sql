-- 156 - Inclui no diretório público as Lojas históricas cadastradas no tenant
-- global da plataforma e remove o banner de demonstração do Visual Lab.

DO $$
DECLARE
  v_function_name text;
  v_function_oid oid;
  v_definition text;
  v_updated_definition text;
BEGIN
  FOREACH v_function_name IN ARRAY ARRAY['public_lodges_search', 'public_lodge_detail']
  LOOP
    SELECT p.oid
      INTO v_function_oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = v_function_name
    ORDER BY p.oid DESC
    LIMIT 1;

    IF v_function_oid IS NULL THEN
      RAISE EXCEPTION 'RPC public.% não encontrada', v_function_name;
    END IF;

    v_definition := pg_get_functiondef(v_function_oid);
    v_updated_definition := replace(
      v_definition,
      'WHERE o.tenant_id = v_tenant_id',
      'WHERE o.tenant_id IN (v_tenant_id, ''00000000-0000-0000-0000-000000000000''::uuid)'
    );

    IF v_updated_definition = v_definition THEN
      RAISE EXCEPTION 'Filtro de tenant não localizado em public.%', v_function_name;
    END IF;

    EXECUTE v_updated_definition;
  END LOOP;
END;
$$;

-- Esse caminho pertencia somente ao protótipo e sempre responde 404 em produção.
UPDATE public.directory_banners
SET is_active = false,
    updated_at = now()
WHERE image_desktop_url = '/visual-lab/assets/banner-reference'
   OR image_mobile_url = '/visual-lab/assets/banner-reference';

COMMENT ON FUNCTION public.public_lodges_search(
  text, text, text, text, text, text, text,
  numeric, numeric, numeric, text, integer, integer
) IS 'Busca pública de Lojas por host, incluindo cadastros históricos publicados do tenant global.';
