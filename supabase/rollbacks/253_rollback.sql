-- Rollback da migration 253_fix_cover_media_type_filter_in_public_rpcs.sql
-- Restaura exatamente as expressões anteriores de public_directory_home_data e public_business_detail.

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

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    v_new := regexp_replace(
      v_def,
      'SELECT cm\.url\s+FROM public\.business_media cm\s+WHERE \(?cm\.business_id = b\.id\)?\s+AND \(?cm\.media_type (?:IN \(''cover'', ''image''\)|= ANY \(ARRAY\[''cover''(?:::text)?,\s*''image''(?:::text)?\]\))\)?\s+ORDER BY \(\(?cm\.media_type = ''cover''(?:::text)?\)?\)\s+DESC,\s*cm\.display_order(?:\s+ASC)?,\s*cm\.created_at(?:\s+ASC)?\s+LIMIT 1',
      'SELECT cm.url FROM public.business_media cm WHERE cm.business_id = b.id ORDER BY (cm.media_type = ''cover'') DESC, cm.display_order ASC LIMIT 1',
      'g'
    );
    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END IF;
END;
$$;

DO $$
DECLARE
  r RECORD;
  v_def text;
  v_new text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('public_business_detail', '_public_business_detail_legacy')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    v_new := regexp_replace(
      v_def,
      'ORDER BY \(\(?m\.media_type (?:IN \(''cover'', ''image''\)|= ANY \(ARRAY\[''cover''(?:::text)?,\s*''image''(?:::text)?\]\))\)?\)\s+DESC,\s*\(\(?m\.media_type = ''cover''(?:::text)?\)?\)\s+DESC,\s*m\.display_order(?:\s+ASC)?,\s*m\.created_at(?:\s+ASC)?\),\s*''\[\]''::jsonb\)\s+INTO v_media',
      'ORDER BY m.display_order ASC, m.created_at ASC), ''[]''::jsonb)' || E'\n' || '  INTO v_media',
      'g'
    );
    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
