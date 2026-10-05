-- 163 - Políticas de administração das pesquisas sem consulta direta a profiles.
--
-- As políticas "Admin full access" (migração 120) consultavam public.profiles dentro
-- da expressão USING. O PostgreSQL avalia essas expressões também para visitante
-- anônimo; como anon não tem SELECT em profiles, a leitura da pesquisa publicada
-- falhava com "permission denied for table profiles". A página pública então mostrava
-- 404 mesmo com a pesquisa publicada.
--
-- A verificação passa a ser feita por função SECURITY DEFINER, que lê profiles como
-- dono e não expõe a tabela ao chamador. A lista de papéis é a mesma da migração 120.

CREATE OR REPLACE FUNCTION public.is_survey_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('master', 'socio_admin', 'admin', 'superadmin', 'gestor', 'operador_suporte', 'diretor_membro')
  );
$$;

REVOKE ALL ON FUNCTION public.is_survey_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_survey_admin() TO anon, authenticated, service_role;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'surveys', 'survey_versions', 'survey_blocks', 'survey_questions',
    'survey_options', 'survey_responses', 'survey_answers'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin full access ' || v_table, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL
         USING ((auth.jwt() ->> ''role'') = ''service_role'' OR public.is_survey_admin())
         WITH CHECK ((auth.jwt() ->> ''role'') = ''service_role'' OR public.is_survey_admin())',
      'Admin full access ' || v_table, v_table
    );
  END LOOP;
END;
$$;
