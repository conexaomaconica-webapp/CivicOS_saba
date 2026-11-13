-- 237 - Módulo Comercial Nacional · Gate 1B · Auditoria de autorização
--
-- Falha a migration se, em qualquer tabela/visão commercial_*:
--   * 'anon' tiver qualquer privilégio;
--   * 'authenticated' tiver algo além de SELECT (nenhuma escrita direta);
--   * tabela com acesso de leitura para 'authenticated' estiver sem RLS ou sem política de SELECT;
--   * a tabela de representantes expuser colunas sensíveis a 'authenticated'.
-- Também confirma que as funções de autorização não são executáveis por 'anon'.

DO $$
DECLARE
  r RECORD;
  v_col TEXT;
  v_total INT := 0;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, c.relkind, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v') AND c.relname LIKE 'commercial\_%'
  LOOP
    v_total := v_total + 1;

    IF to_regrole('anon') IS NOT NULL
       AND (has_table_privilege('anon', r.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
            OR has_any_column_privilege('anon', r.oid, 'SELECT, INSERT, UPDATE, REFERENCES')) THEN
      RAISE EXCEPTION 'Auditoria Gate 1B: anon possui acesso a public.%.', r.relname;
    END IF;

    IF to_regrole('authenticated') IS NOT NULL THEN
      IF has_table_privilege('authenticated', r.oid, 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
         OR has_any_column_privilege('authenticated', r.oid, 'INSERT, UPDATE, REFERENCES') THEN
        RAISE EXCEPTION 'Auditoria Gate 1B: authenticated possui escrita/privilégio indevido em public.%.', r.relname;
      END IF;

      IF r.relkind = 'r'
         AND has_any_column_privilege('authenticated', r.oid, 'SELECT')
         AND NOT r.relrowsecurity THEN
        RAISE EXCEPTION 'Auditoria Gate 1B: public.% legível por authenticated sem RLS.', r.relname;
      END IF;

      IF r.relkind = 'r'
         AND has_any_column_privilege('authenticated', r.oid, 'SELECT')
         AND NOT EXISTS (
           SELECT 1 FROM pg_policies p
           WHERE p.schemaname = 'public' AND p.tablename = r.relname AND p.cmd = 'SELECT'
             AND 'authenticated' = ANY (p.roles)
         ) THEN
        RAISE EXCEPTION 'Auditoria Gate 1B: public.% sem política SELECT para authenticated.', r.relname;
      END IF;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Auditoria Gate 1B: nenhuma tabela commercial_* encontrada.';
  END IF;

  IF to_regrole('authenticated') IS NOT NULL THEN
    FOREACH v_col IN ARRAY ARRAY['document_hash', 'document_encrypted', 'pix_key_encrypted', 'tax_profile', 'created_by']
    LOOP
      IF has_column_privilege('authenticated', 'public.commercial_representatives', v_col, 'SELECT') THEN
        RAISE EXCEPTION 'Auditoria Gate 1B: coluna sensível % exposta a authenticated.', v_col;
      END IF;
    END LOOP;
  END IF;

  IF to_regrole('anon') IS NOT NULL
     AND has_function_privilege('anon', 'public.has_commercial_permission(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Auditoria Gate 1B: anon pode executar has_commercial_permission.';
  END IF;

  RAISE NOTICE 'Auditoria Gate 1B: % objetos commercial_* verificados (authenticated somente leitura, colunas sensíveis protegidas).', v_total;
END $$;
