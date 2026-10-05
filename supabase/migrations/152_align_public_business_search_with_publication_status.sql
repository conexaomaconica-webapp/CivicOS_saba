-- 152 — Alinha "Todas as Empresas" com o estado canônico de publicação.
--
-- A publicação/despublicação já é governada por businesses.publication_status e
-- businesses.is_active. A busca pública mantinha uma segunda trava baseada no
-- último registro de subscriptions, o que ocultava empresas publicadas quando
-- existia uma assinatura auxiliar/antiga com status pendente.

DO $$
DECLARE
  v_function_oid oid;
  v_definition text;
  v_updated_definition text;
  v_legacy_filter text :=
    '      AND (COALESCE(sub_status.status, ''active''::text) <> ALL (ARRAY[''past_due''::text, ''canceled''::text, ''unpaid''::text, ''pending''::text, ''suspended''::text]))';
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
  v_updated_definition := replace(v_definition, v_legacy_filter, '');

  -- Compatibilidade com bancos em que a função ainda preserva a expressão
  -- original da migration, sem o formato normalizado pelo PostgreSQL.
  v_updated_definition := replace(
    v_updated_definition,
    '      AND COALESCE(sub_status.status, ''active'') NOT IN (''past_due'', ''canceled'', ''unpaid'', ''pending'', ''suspended'')',
    ''
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Filtro legado de subscriptions não localizado em public_businesses_search';
  END IF;

  EXECUTE v_updated_definition;
END;
$$;

COMMENT ON FUNCTION public.public_businesses_search(
  text, text, text[], text, text, text, text, text[], text[], text[],
  boolean, boolean, numeric, numeric, numeric, text, integer, integer
) IS 'Busca pública canônica: businesses.publication_status=published e is_active=true; assinatura é validada no Gate Final.';
