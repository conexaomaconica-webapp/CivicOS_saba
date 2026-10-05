-- 154 — Compatibilidade do diretório nacional com cadastros administrativos
-- históricos gravados no tenant global da plataforma.
--
-- Somente empresas explicitamente ativas e publicadas continuam elegíveis.
-- Novos cadastros devem usar o tenant canônico resolvido pelo host.

DO $$
DECLARE
  v_function_oid oid;
  v_definition text;
  v_updated_definition text;
BEGIN
  SELECT p.oid
    INTO v_function_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_businesses_search'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_host text, p_query text, p_slugs text[], p_state text, p_city text, p_category_slug text, p_subcategory_slug text, p_relationships text[], p_recognitions text[], p_plans text[], p_verified boolean, p_has_benefits boolean, p_user_lat numeric, p_user_lng numeric, p_max_distance_km numeric, p_sort text, p_page integer, p_page_size integer';

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'RPC public.public_businesses_search não encontrada';
  END IF;

  v_definition := pg_get_functiondef(v_function_oid);
  v_updated_definition := replace(
    v_definition,
    'WHERE b.tenant_id = v_tenant_id',
    'WHERE b.tenant_id IN (v_tenant_id, ''00000000-0000-0000-0000-000000000000''::uuid)'
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Filtro canônico de tenant não localizado em public_businesses_search';
  END IF;

  EXECUTE v_updated_definition;
END;
$$;

COMMENT ON FUNCTION public.public_businesses_search(
  text, text, text[], text, text, text, text, text[], text[], text[],
  boolean, boolean, numeric, numeric, numeric, text, integer, integer
) IS 'Busca pública por host, incluindo cadastros publicados históricos do tenant global da plataforma.';
