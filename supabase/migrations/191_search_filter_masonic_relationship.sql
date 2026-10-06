-- 191 - Filtro "Vínculo Maçônico" do Guia: Maçom, Cunhada e Sobrinho(a).
--
-- Antes o filtro usava o tipo de vínculo cadastrado (proprietário, representante, colaborador, parceiro institucional...).
-- Agora usa o tratamento do responsável da empresa (business_responsibles.community_label), o mesmo que aparece na página
-- pública: "Irmão"/"Ir.'." -> maçom, "Cunhada" -> cunhada, "Sobrinho/Sobrinha" -> sobrinho(a).
-- Empresa sem responsável cadastrado conta como maçom. Valores aceitos em p_relationships: 'macom', 'cunhada', 'sobrinho'.
-- Mesmo padrão da 175: reescreve a condição dentro da função existente, sem copiar a função inteira.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
  v_old text := 'lower(COALESCE(masonic_link.link_type, ''''))';
  v_cond text := $c$COALESCE((
          SELECT CASE
            WHEN lower(br_f.community_label) LIKE '%cunhada%' THEN 'cunhada'
            WHEN lower(br_f.community_label) LIKE '%sobrinh%' THEN 'sobrinho'
            ELSE 'macom'
          END
          FROM public.business_responsibles br_f
          WHERE br_f.business_id = b.id
          LIMIT 1
        ), 'macom')$c$;
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

  IF position('br_f.community_label' IN v_def) > 0 THEN
    RAISE NOTICE 'Filtro de vínculo já aplicado; nada a fazer.';
    RETURN;
  END IF;

  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Condição de vínculo não localizada em public_businesses_search (aplique a 175 antes desta).';
  END IF;

  v_new := replace(v_def, v_old, v_cond);
  EXECUTE v_new;
END
$$;

NOTIFY pgrst, 'reload schema';
