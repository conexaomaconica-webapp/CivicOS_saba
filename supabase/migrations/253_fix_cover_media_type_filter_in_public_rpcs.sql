-- 253 - Garante que cover_url em public_directory_home_data selecione apenas mídias de imagem ('cover', 'image')
-- e que public_business_detail ordene mídias de imagem antes de vídeos quando display_order empatar em 0.
-- Preserva integralmente os vídeos institucionais (media_type = 'video'), assinaturas, permissões e estrutura JSON.

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_new text;
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

  IF position('cm.media_type IN (''cover'', ''image'')' IN v_def) > 0
     OR position('cm.media_type = ANY (ARRAY[''cover''' IN v_def) > 0 THEN
    RAISE NOTICE 'public_directory_home_data já filtra cm.media_type IN (cover, image); nada a alterar';
  ELSE
    v_new := regexp_replace(
      v_def,
      'SELECT cm\.url\s+FROM public\.business_media cm\s+WHERE \(?cm\.business_id = b\.id\)?\s+ORDER BY \(\(?cm\.media_type = ''cover''(?:::text)?\)?\)\s+DESC,\s*cm\.display_order(?:\s+ASC)?\s+LIMIT 1',
      'SELECT cm.url FROM public.business_media cm WHERE cm.business_id = b.id AND cm.media_type IN (''cover'', ''image'') ORDER BY (cm.media_type = ''cover'') DESC, cm.display_order ASC, cm.created_at ASC LIMIT 1',
      'g'
    );
    IF v_new = v_def THEN
      RAISE EXCEPTION 'Subquery esperada de cover_url não localizada em public_directory_home_data';
    END IF;
    EXECUTE v_new;
  END IF;
END;
$$;

-- Em public_business_detail (e _public_business_detail_legacy, se existir), garante que no array media
-- as imagens ('cover', 'image') venham antes de 'video' quando ambos possuírem display_order = 0,
-- sem remover o vídeo do array media.
DO $$
DECLARE
  r RECORD;
  v_def text;
  v_new text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('public_business_detail', '_public_business_detail_legacy')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    IF position('m.media_type IN (''cover'', ''image'')' IN v_def) = 0
       AND position('m.media_type = ANY (ARRAY[''cover''' IN v_def) = 0
       AND position('INTO v_media' IN v_def) > 0 THEN
      v_new := regexp_replace(
        v_def,
        'ORDER BY m\.display_order(?:\s+ASC)?,\s*m\.created_at(?:\s+ASC)?\),\s*''\[\]''::jsonb\)\s+INTO v_media',
        'ORDER BY (m.media_type IN (''cover'', ''image'')) DESC, (m.media_type = ''cover'') DESC, m.display_order ASC, m.created_at ASC), ''[]''::jsonb)' || E'\n' || '  INTO v_media',
        'g'
      );
      IF v_new <> v_def THEN
        EXECUTE v_new;
      END IF;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
