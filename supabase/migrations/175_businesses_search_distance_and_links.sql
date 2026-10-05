-- 175 - Busca de empresas: distância máxima e vínculo maçônico passam a funcionar.
--
-- 1. p_max_distance_km era recebido mas NUNCA usado na função public_businesses_search. Agora, quando a página envia
--    a localização do visitante (p_user_lat/p_user_lng) junto com a distância máxima, só entram empresas com
--    alguma localização cadastrada dentro do raio. Empresas sem coordenadas não entram nesse filtro (não há como
--    confirmar a distância). Sem localização do visitante, o filtro de distância é ignorado.
-- 2. Vínculo maçônico: antes, empresa sem vínculo verificado era tratada como "owner" e aparecia ao filtrar por
--    proprietário. Agora só vale o vínculo realmente verificado/ativo/aprovado.
--
-- A função é alterada por substituição de texto sobre a definição atual (como nas migrações 156–158), para preservar
-- tudo o que já foi ajustado nela. Pode ser reaplicada sem efeito adicional.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
  v_filter_old CONSTANT text := 'AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL)';
  v_distance_clause CONSTANT text := E'AND (v_has_benefits IS NOT TRUE OR ben.id IS NOT NULL)
      AND (
        p_max_distance_km IS NULL OR p_user_lat IS NULL OR p_user_lng IS NULL
        OR (
          bl.latitude IS NOT NULL AND bl.longitude IS NOT NULL
          AND 6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(p_user_lat)) * cos(radians(bl.latitude)) *
              cos(radians(bl.longitude) - radians(p_user_lng)) +
              sin(radians(p_user_lat)) * sin(radians(bl.latitude))
            ))
          ) <= p_max_distance_km
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
  v_new := v_def;

  -- 1. Distância máxima (idempotente: não duplica se já aplicada)
  IF position('p_max_distance_km IS NULL OR p_user_lat IS NULL' IN v_new) = 0 THEN
    v_new := replace(v_new, v_filter_old, v_distance_clause);
    IF v_new = v_def THEN
      RAISE EXCEPTION 'Filtro de benefícios não localizado em public_businesses_search; distância não aplicada';
    END IF;
  END IF;

  -- 2. Vínculo: só conta vínculo verificado (empresa sem vínculo deixa de valer como "owner")
  v_new := replace(
    v_new,
    'lower(COALESCE(masonic_link.link_type, ''owner''))',
    'lower(COALESCE(masonic_link.link_type, ''''))'
  );

  IF v_new <> v_def THEN
    EXECUTE v_new;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
