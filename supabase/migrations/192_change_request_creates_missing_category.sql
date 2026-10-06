-- 192 - Categoria do anunciante: escolhe do catálogo; só cria uma nova se não existir.
--
-- Ao aprovar a alteração de perfil (189), a categoria informada era ligada ao catálogo apenas quando o nome já existia.
-- Agora, se o nome não existir no catálogo do tenant, a categoria é criada (ativa) no momento da aprovação — ou seja,
-- depois da análise da equipe — e vira a categoria principal da empresa. Mesmo padrão da 175/191: reescreve um trecho
-- da função existente via pg_get_functiondef, sem copiá-la inteira.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_old text := 'IF v_cat IS NOT NULL THEN';
  v_new text := $n$IF v_cat IS NULL AND length(btrim(v_p ->> 'category')) > 0 THEN
        INSERT INTO public.categories (tenant_id, name, slug, is_active)
        VALUES (
          p_req.tenant_id,
          btrim(v_p ->> 'category'),
          trim(both '-' from regexp_replace(
            lower(translate(btrim(v_p ->> 'category'),
              'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
              'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
            '[^a-z0-9]+', '-', 'g')),
          true
        )
        ON CONFLICT (tenant_id, slug) WHERE tenant_id IS NOT NULL DO NOTHING;

        SELECT c.id INTO v_cat FROM public.categories c
        WHERE c.tenant_id = p_req.tenant_id AND lower(c.name) = lower(btrim(v_p ->> 'category'))
        LIMIT 1;
      END IF;

      IF v_cat IS NOT NULL THEN$n$;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '_apply_business_change_request'
  ORDER BY p.oid DESC
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Função _apply_business_change_request não encontrada (aplique a 189 antes desta).';
  END IF;

  v_def := pg_get_functiondef(v_oid);

  IF position('INSERT INTO public.categories' IN v_def) > 0 THEN
    RAISE NOTICE 'Criação de categoria já aplicada; nada a fazer.';
    RETURN;
  END IF;

  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'Trecho de categoria não localizado em _apply_business_change_request.';
  END IF;

  EXECUTE replace(v_def, v_old, v_new);
END
$$;

NOTIFY pgrst, 'reload schema';
