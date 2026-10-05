-- 158 - Cidade e UF exibidas nos cards públicos vêm da sede (is_headquarters).
--
-- A RPC public_businesses_search fazia LEFT JOIN direto em business_locations, sem
-- ordenação. Com mais de uma localização por empresa, o DISTINCT ON escolhia uma
-- linha qualquer (por exemplo, uma localização SP de onboarding).
-- A junção passa a ser lateral e ordenada pela sede e pela ordem de cadastro.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
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
  v_new := replace(
    v_def,
    'LEFT JOIN public.business_locations bl ON bl.tenant_id = b.tenant_id AND bl.business_id = b.id',
    'LEFT JOIN LATERAL (
      SELECT bl0.*
      FROM public.business_locations bl0
      WHERE bl0.tenant_id = b.tenant_id AND bl0.business_id = b.id
      ORDER BY bl0.is_headquarters DESC, bl0.created_at ASC
      LIMIT 1
    ) bl ON true'
  );

  IF v_new = v_def THEN
    RAISE EXCEPTION 'Junção de business_locations não localizada em public_businesses_search';
  END IF;

  EXECUTE v_new;
END;
$$;
