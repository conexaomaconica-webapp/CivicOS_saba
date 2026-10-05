-- 153 — Corrige a RPC da Home do Guia para o schema atual de business_locations.
-- A coluna canônica é is_headquarters; is_primary era uma referência legada.

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
    AND p.proname = 'public_directory_home_data'
    AND pg_get_function_identity_arguments(p.oid) = 'p_host text, p_city text';

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'RPC public.public_directory_home_data não encontrada';
  END IF;

  v_definition := pg_get_functiondef(v_function_oid);
  v_updated_definition := replace(
    v_definition,
    'ORDER BY is_primary DESC, created_at ASC',
    'ORDER BY is_headquarters DESC, created_at ASC'
  );

  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Referência legada is_primary não localizada em public_directory_home_data';
  END IF;

  EXECUTE v_updated_definition;
END;
$$;

COMMENT ON FUNCTION public.public_directory_home_data(text, text)
  IS 'Home pública do Guia com localização priorizada por business_locations.is_headquarters.';
