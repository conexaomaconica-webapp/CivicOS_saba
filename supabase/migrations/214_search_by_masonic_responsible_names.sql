-- 214 - Busca por Irmão, Cunhada e Sobrinho(a) no Guia Comercial
--
-- Permite que a busca inteligente por texto (p_query) encontre empresas quando o usuário
-- digita o nome do irmão responsável, da cunhada, do sobrinho(a) ou do maçom de referência
-- (reference_mason_name) cadastrado no vínculo maçônico familiar.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
  v_old CONSTANT text := 'OR lower(b.slug) LIKE ''%'' || lower(v_query) || ''%''
      )';
  v_replacement CONSTANT text := 'OR lower(b.slug) LIKE ''%'' || lower(v_query) || ''%''
        OR EXISTS (
          SELECT 1 FROM public.business_responsibles br_q
          WHERE br_q.business_id = b.id
            AND (
              public._normalize_search(br_q.name) LIKE ''%'' || public._normalize_search(v_query) || ''%''
              OR public._normalize_search(COALESCE(br_q.community_label, '''')) LIKE ''%'' || public._normalize_search(v_query) || ''%''
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.business_masonic_links bml_q
          WHERE bml_q.business_id = b.id
            AND public._normalize_search(COALESCE(bml_q.reference_mason_name, '''')) LIKE ''%'' || public._normalize_search(v_query) || ''%''
        )
      )';
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'public_businesses_search'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'RPC public.public_businesses_search não encontrada';
  END IF;

  v_def := pg_get_functiondef(v_oid);

  IF position('br_q.business_id = b.id' IN v_def) > 0 THEN
    RAISE NOTICE 'Busca por responsável e maçom de referência já aplicada; nada a fazer.';
    RETURN;
  END IF;

  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Trecho da busca por slug não localizado em public_businesses_search.';
  END IF;

  v_new := replace(v_def, v_old, v_replacement);
  EXECUTE v_new;
END
$$;

NOTIFY pgrst, 'reload schema';
