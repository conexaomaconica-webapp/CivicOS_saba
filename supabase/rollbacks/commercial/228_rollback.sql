-- ROLLBACK da migration 228 (fundação). Fora de supabase/migrations de propósito.
-- Execute os rollbacks 232 -> 231 -> 230 -> 229 antes deste.
-- Representantes e documentos nunca são apagados se existirem. Configuração e permissões podem ser
-- descartadas com: SET commercial.allow_destructive_rollback = 'on';
-- A extensão btree_gist NÃO é removida (pode ser usada por outros objetos).

DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_representatives', 'commercial_representative_documents']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'Rollback 228 recusado: public.% possui % linha(s).', t, n;
      END IF;
    END IF;
  END LOOP;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM storage.objects WHERE bucket_id = ''commercial-documents''' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'Rollback 228 recusado: o bucket commercial-documents possui % arquivo(s).', n;
    END IF;
  END IF;

  IF coalesce(current_setting('commercial.allow_destructive_rollback', true), 'off') <> 'on' THEN
    FOREACH t IN ARRAY ARRAY['commercial_settings', 'commercial_access_grants']
    LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
        IF n > 0 THEN
          RAISE EXCEPTION 'Rollback 228 recusado: public.% possui % linha(s). Use SET commercial.allow_destructive_rollback = ''on'' para descartar.', t, n;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.commercial_representative_documents;
DROP TABLE IF EXISTS public.commercial_representatives;
DROP TABLE IF EXISTS public.commercial_access_grants;
DROP TABLE IF EXISTS public.commercial_settings;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    DELETE FROM storage.buckets WHERE id = 'commercial-documents';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
