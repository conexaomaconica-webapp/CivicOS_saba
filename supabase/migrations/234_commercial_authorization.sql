-- 234 - Módulo Comercial Nacional · Gate 1B · Funções de autorização
--
-- Modelo (decisões aprovadas):
--   * Administradores da plataforma NÃO entram automaticamente: o acesso comercial vem apenas de
--     commercial_access_grants. Única exceção: 'master' (recuperação), via has_global_platform_role('master').
--   * Representante acessa só os próprios dados, pelo vínculo commercial_representatives.user_id
--     (o mesmo login pode ser anunciante e representante; profiles.role é irrelevante aqui).
--   * Escopos do representante: 'self' (qualquer status), 'operational' (status = active),
--     'financial' (active, suspended, terminated: histórico de créditos preservado, somente leitura).
--   * Tudo exige o módulo habilitado para o tenant (commercial_settings.module_enabled), exceto 'master'.
--
-- Funções SECURITY DEFINER com search_path fixo; executáveis por 'authenticated' (necessário para
-- avaliar políticas RLS) e nunca por 'anon'. Reversão: supabase/rollbacks/commercial/234_rollback.sql

-- Operação comercial deixa de exigir captura ligada: permite testar a área do representante
-- sem capturar nenhum pagamento (capture_mode pode permanecer 'off').
ALTER TABLE public.commercial_settings
  DROP CONSTRAINT IF EXISTS commercial_settings_module_requires_capture;

CREATE OR REPLACE FUNCTION public.commercial_try_uuid(p_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN p_value::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_module_enabled(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT s.module_enabled FROM public.commercial_settings s WHERE s.tenant_id = p_tenant_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.commercial_profile_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.status = 'active' AND p.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.has_commercial_permission(p_tenant_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL OR p_permission IS NULL THEN
    RETURN false;
  END IF;
  IF NOT public.commercial_profile_is_active() THEN
    RETURN false;
  END IF;

  -- Exceção de recuperação: somente 'master' (nenhum outro papel administrativo).
  IF public.has_global_platform_role('master') THEN
    RETURN true;
  END IF;

  IF NOT public.commercial_module_enabled(p_tenant_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.commercial_access_grants g
    WHERE g.tenant_id = p_tenant_id
      AND g.user_id = auth.uid()
      AND g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (
        g.permission = p_permission
        -- "manage"/"approve" implicam leitura do mesmo domínio.
        OR (p_permission = 'representatives.read' AND g.permission = 'representatives.manage')
        OR (p_permission = 'commissions.read' AND g.permission IN ('commissions.approve', 'payouts.manage'))
        OR (p_permission = 'rules.read' AND g.permission IN ('rules.manage', 'rules.approve'))
      )
  );
END;
$$;

-- Acesso do representante a um registro seu (p_representative_id), por escopo.
CREATE OR REPLACE FUNCTION public.commercial_rep_access(p_tenant_id UUID, p_representative_id UUID, p_scope TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_tenant_id IS NULL OR p_representative_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT public.commercial_profile_is_active() OR NOT public.commercial_module_enabled(p_tenant_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.commercial_representatives r
    WHERE r.id = p_representative_id
      AND r.tenant_id = p_tenant_id
      AND r.user_id = auth.uid()
      AND (
        p_scope = 'self'
        OR (p_scope = 'financial' AND r.status IN ('active', 'suspended', 'terminated'))
        OR (p_scope = 'operational' AND r.status = 'active')
      )
  );
END;
$$;

-- Atalhos para tabelas filhas (lead e repasse), sem depender de RLS aninhada.
CREATE OR REPLACE FUNCTION public.commercial_lead_rep_access(p_tenant_id UUID, p_lead_id UUID, p_scope TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.commercial_leads l
    WHERE l.id = p_lead_id AND l.tenant_id = p_tenant_id
      AND public.commercial_rep_access(l.tenant_id, l.representative_id, p_scope)
  )
$$;

CREATE OR REPLACE FUNCTION public.commercial_payout_rep_access(p_tenant_id UUID, p_payout_id UUID, p_scope TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.commercial_payouts p
    WHERE p.id = p_payout_id AND p.tenant_id = p_tenant_id
      AND public.commercial_rep_access(p.tenant_id, p.representative_id, p_scope)
  )
$$;

DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'commercial_try_uuid(text)',
    'commercial_module_enabled(uuid)',
    'commercial_profile_is_active()',
    'has_commercial_permission(uuid, text)',
    'commercial_rep_access(uuid, uuid, text)',
    'commercial_lead_rep_access(uuid, uuid, text)',
    'commercial_payout_rep_access(uuid, uuid, text)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
