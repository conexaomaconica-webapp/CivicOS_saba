-- 210 - Hardening local das funcoes de autorizacao P0-B.
-- Nao aplicar no projeto remoto sem revisao e homologacao independentes.

CREATE OR REPLACE FUNCTION public.has_global_platform_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_role IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = p_role
      AND p.status = 'active'
      AND p.deleted_at IS NULL
  ) THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR statement_timestamp() < ur.expires_at)
      AND (r.is_global = true OR ur.tenant_id IS NULL)
      AND r.code = p_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_tenant_id IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.status = 'active' AND p.deleted_at IS NULL
  ) THEN RETURN false; END IF;
  IF public.has_global_platform_role('master') THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'tenant_admin', 'owner', 'socio_admin')
      AND tm.approved_at IS NOT NULL
  ) THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id
      AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR statement_timestamp() < ur.expires_at)
      AND r.code IN ('tenant_admin', 'admin', 'owner', 'socio_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_own_profile_authority_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() = OLD.id AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR (OLD.terms_accepted_at IS NOT NULL AND NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at)
    OR (OLD.privacy_accepted_at IS NOT NULL AND NEW.privacy_accepted_at IS DISTINCT FROM OLD.privacy_accepted_at)
  ) THEN
    RAISE EXCEPTION 'Campos de autoridade do perfil nao podem ser alterados no autoatendimento'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.has_global_platform_role(TEXT) OWNER TO postgres;
ALTER FUNCTION public.has_tenant_admin_access(UUID) OWNER TO postgres;
ALTER FUNCTION public.protect_own_profile_authority_fields() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_profiles_protect_own_authority_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_own_authority_fields
  BEFORE UPDATE OF id, role, tenant_id, status, deleted_at,
    terms_accepted_at, privacy_accepted_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_own_profile_authority_fields();

REVOKE ALL ON FUNCTION public.has_global_platform_role(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_tenant_admin_access(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_own_profile_authority_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_platform_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_tenant_admin_access(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_own_profile_authority_fields() TO service_role;
