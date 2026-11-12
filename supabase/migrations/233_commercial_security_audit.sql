-- 233 - Módulo Comercial Nacional · Gate 1A · Auditoria de segurança do esquema
--
-- Falha a migration se qualquer tabela/visão commercial_* estiver sem RLS ou acessível a
-- anon/authenticated/PUBLIC, ou se o bucket de documentos não for privado.
-- Não cria objetos. Políticas por papel (representante, gestor, financeiro) entram no Gate 1B.

DO $$
DECLARE
  r RECORD;
  v_role TEXT;
  v_total INT := 0;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, c.relkind, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'v')
      AND c.relname LIKE 'commercial\_%'
  LOOP
    v_total := v_total + 1;

    IF r.relkind = 'r' AND NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'Auditoria Gate 1A: public.% está sem RLS habilitada.', r.relname;
    END IF;

    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      IF to_regrole(v_role) IS NOT NULL
         AND has_table_privilege(v_role, r.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
        RAISE EXCEPTION 'Auditoria Gate 1A: % possui acesso direto a public.%.', v_role, r.relname;
      END IF;
    END LOOP;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Auditoria Gate 1A: nenhuma tabela commercial_* encontrada (migrations 228-232 aplicadas?).';
  END IF;

  IF to_regclass('storage.buckets') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'commercial-documents' AND public = false) THEN
      RAISE EXCEPTION 'Auditoria Gate 1A: bucket commercial-documents ausente ou público.';
    END IF;
  END IF;

  RAISE NOTICE 'Auditoria Gate 1A: % objetos commercial_* verificados (RLS ligada, sem acesso anon/authenticated).', v_total;
END $$;
