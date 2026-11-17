-- 248 - O dono da empresa (businesses.owner_id) passa a ter o papel 'owner' em has_business_permission
--
-- Problema: as telas Conexões, Indicações e Resultados do Portal do Anunciante (e outras funções que autorizam por
-- has_business_permission) só reconheciam admin do tenant ou uma linha ATIVA em business_members. Donos cadastrados apenas
-- por businesses.owner_id (como a Óptica Circulô; 21 empresas na data da análise) eram negados com "Sem permissão para ver...",
-- embora o portal os reconhecesse como donos (findAdvertiserBusiness). Nenhum fluxo de cadastro grava a linha em business_members.
-- A migration 190 corrigiu a mesma classe de erro nas políticas de conteúdo; esta corrige a função central de autorização.
--
-- Efeito: quem é businesses.owner_id de UMA empresa passa a ser tratado como 'owner' DESSA empresa (mesmo tenant), para todas
-- as funções que listam 'owner' entre os papéis aceitos. Não concede nada em outras empresas, nem a papéis que não incluem
-- 'owner'. Admin do tenant e business_members continuam exatamente como antes (mudança ADITIVA).
-- Reversão: supabase/rollbacks/connections/248_rollback.sql

CREATE OR REPLACE FUNCTION public.has_business_permission(
  p_tenant_id UUID,
  p_business_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_business_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_tenant_admin_access(p_tenant_id) THEN
    RETURN true;
  END IF;

  -- Dono direto da empresa (businesses.owner_id) = papel 'owner' naquela empresa.
  IF 'owner' = ANY(p_roles) AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.tenant_id = p_tenant_id
      AND b.owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'business_members'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = p_tenant_id
        AND bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role = ANY(p_roles)
    );
  END IF;

  RETURN false;
END;
$$;

NOTIFY pgrst, 'reload schema';
