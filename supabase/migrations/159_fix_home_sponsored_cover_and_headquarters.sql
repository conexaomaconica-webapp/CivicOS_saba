-- 159 - Corrige a Home do Guia: a RPC public_directory_home_data referenciava
-- b.cover_url, coluna que não existe em businesses. A execução falhava sempre e a
-- página caía num fallback com cidade da primeira localização não ordenada.
-- A capa passa a vir de business_media, como na busca pública.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
  v_count integer;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'public_directory_home_data'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'RPC public.public_directory_home_data não encontrada';
  END IF;

  v_def := pg_get_functiondef(v_oid);
  v_count := (length(v_def) - length(replace(v_def, 'b.cover_url', ''))) / length('b.cover_url');

  IF v_count = 0 THEN
    RAISE NOTICE 'public_directory_home_data não referencia b.cover_url; nada a corrigir';
    RETURN;
  END IF;

  v_new := replace(
    v_def,
    'public._safe_public_url(b.cover_url)',
    'public._safe_public_url((SELECT cm.url FROM public.business_media cm WHERE cm.business_id = b.id ORDER BY (cm.media_type = ''cover'') DESC, cm.display_order ASC LIMIT 1))'
  );

  IF position('b.cover_url' IN v_new) > 0 THEN
    RAISE EXCEPTION 'Referência b.cover_url ainda presente em public_directory_home_data';
  END IF;

  EXECUTE v_new;
END;
$$;
