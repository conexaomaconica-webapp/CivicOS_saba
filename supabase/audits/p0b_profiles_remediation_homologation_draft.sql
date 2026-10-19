-- P0-B — Draft de remediação de public.profiles para HOMOLOGAÇÃO
-- STATUS: NÃO EXECUTAR. Requer revisão SQL, backup lógico e autorização formal.
-- Projeto compartilhado multi-tenant: testar primeiro fora da produção.
-- Este arquivo não deve ser colocado em supabase/migrations sem aprovação.

-- ================================================================
-- FASE 0 — pré-condições (executar como consultas de inspeção)
-- ================================================================
-- Confirmar antes da mudança:
-- 1. Project Ref do ambiente de homologação.
-- 2. Backup/export seguro de schema, policies e grants.
-- 3. Consumidores Web migrados para helpers/RPCs ou serviços allowlist.
-- 4. Policy de próprio perfil e policy administrativa testadas.
-- 5. Nenhuma chamada cliente depende de SELECT global em profiles.
-- 6. Plano de rollback funcional aprovado; nunca restaurar USING (true).

-- ================================================================
-- FASE 1 — contenção da exposição de linhas (homologação)
-- ================================================================
-- Remove somente a policy global identificada no catálogo.
-- Não remover policies de próprio perfil/admin sem a matriz aprovada.
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;

-- Garantir que a leitura autenticada continue explicitamente condicionada
-- ao próprio usuário ou a escopo administrativo efetivo.
DROP POLICY IF EXISTS "Authenticated users can view authorized profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view authorized profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR has_tenant_admin_access(tenant_id)
    OR has_global_platform_role('master'::text)
  );

-- Não conceder leitura a anon. O grant deve ser confirmado no catálogo;
-- este REVOKE só entra na migration aprovada após revisão de dependências.
REVOKE SELECT ON TABLE public.profiles FROM anon;

-- ================================================================
-- FASE 2 — redução de colunas (migration separada, após consumidores)
-- ================================================================
-- NÃO incluir na mesma aplicação da Fase 1 sem homologação.
-- A revogação de SELECT de tabela quebra consumidores que selecionam role,
-- tenant_id, status ou outras colunas diretamente.
--
-- REVOKE SELECT ON TABLE public.profiles FROM authenticated, PUBLIC;
-- GRANT SELECT (
--   id, name, email, phone, city, state, avatar_url,
--   created_at, updated_at
-- ) ON TABLE public.profiles TO authenticated;
--
-- role, tenant_id, status, rhid e consentimentos devem ser obtidos somente
-- por serviço/RPC autorizado e não por consulta direta do cliente.

-- ================================================================
-- FASE 3 — validações pós-migration (não são smoke tests de produção)
-- ================================================================
-- Executar apenas em homologação com fixtures sintéticas e roles reais
-- anon/authenticated, depois de revisar o ambiente.
