-- P0-B HARDENING DRAFT — NÃO APLICAR AUTOMATICAMENTE
--
-- Escopo: funções de autorização e trigger de proteção de profiles.
-- Este arquivo é uma proposta revisável para ambiente local descartável.
-- Não executar contra produção, não inclui grants de negócio nem altera Auth.
-- Pré-requisito: migrations 001, 002, 005, 006, 108 e 204 aplicadas localmente.

BEGIN;

-- Conta ativa é requisito para qualquer autoridade derivada de profiles.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT p.role
    INTO user_role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
    AND p.status = 'active'
    AND p.deleted_at IS NULL;

  RETURN COALESCE(user_role, 'usuario_comum');
END;
$$;

CREATE OR REPLACE FUNCTION public.has_global_platform_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_role IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND p.role = p_role
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    JOIN public.roles AS r ON r.id = ur.role_id
    JOIN public.profiles AS p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > statement_timestamp())
      AND p.status = 'active'
      AND p.deleted_at IS NULL
      AND r.code = p_role
      AND r.is_global = true
      AND r.tenant_id IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  IF public.has_global_platform_role('master') THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tenant_members AS tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'tenant_admin', 'owner', 'socio_admin')
      AND tm.approved_at IS NOT NULL
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    JOIN public.roles AS r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > statement_timestamp())
      AND r.code IN ('tenant_admin', 'admin', 'owner', 'socio_admin')
      AND (
        (r.is_global = true AND r.tenant_id IS NULL)
        OR r.tenant_id = p_tenant_id
      )
  );
END;
$$;

-- Self-service pode atualizar dados pessoais, mas não autoridade nem aceite já registrado.
CREATE OR REPLACE FUNCTION public.protect_own_profile_authority_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() = OLD.id THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Campos de autoridade do perfil nao podem ser alterados no autoatendimento'
        USING ERRCODE = '42501';
    END IF;

    IF (OLD.terms_accepted_at IS NOT NULL AND NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at)
      OR (OLD.privacy_accepted_at IS NOT NULL AND NEW.privacy_accepted_at IS DISTINCT FROM OLD.privacy_accepted_at) THEN
      RAISE EXCEPTION 'Registros de consentimento ja emitidos nao podem ser alterados no autoatendimento'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_own_authority_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_own_authority_fields
  BEFORE UPDATE OF id, role, tenant_id, status, deleted_at, terms_accepted_at, privacy_accepted_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_own_profile_authority_fields();

ALTER FUNCTION public.get_current_user_role() OWNER TO postgres;
ALTER FUNCTION public.has_global_platform_role(TEXT) OWNER TO postgres;
ALTER FUNCTION public.has_tenant_admin_access(UUID) OWNER TO postgres;
ALTER FUNCTION public.protect_own_profile_authority_fields() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_global_platform_role(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_tenant_admin_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_own_profile_authority_fields() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_platform_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_admin_access(UUID) TO authenticated;

-- Revisão manual obrigatória antes de homologar: confirmar se outras policies
-- dependem dessas funções com anon; nenhuma concessão a PUBLIC é restaurada.

ROLLBACK;
