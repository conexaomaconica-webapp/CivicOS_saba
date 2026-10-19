-- Bootstrap mínimo para homologação P0-B em um projeto Supabase descartável.
-- Não executar no projeto oficial. Não contém dados reais.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  city text,
  state text,
  tenant_id uuid REFERENCES public.tenants(id),
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  role_type text NOT NULL DEFAULT 'tenant'
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  PRIMARY KEY (tenant_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  approved_at timestamptz,
  membership_source text,
  PRIMARY KEY (tenant_id, user_id)
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- O teste chama as funções como usuário autenticado; os fixtures são criados
-- dentro da própria transação do arquivo 205 e revertidos ao final.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants, public.profiles,
  public.roles, public.user_roles, public.tenant_members TO authenticated;

-- Migration 062 reintroduced a broad read policy; the local P0-B fixture
-- models the approved containment before executing the member tests.
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;

-- Hardening local aplicado antes dos testes P0-B. Isto não é uma migration de
-- produção; serve apenas para que o banco descartável exercite o draft.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
DECLARE v_role text;
BEGIN
  SELECT p.role INTO v_role FROM public.profiles p
  WHERE p.id = auth.uid() AND p.status = 'active' AND p.deleted_at IS NULL;
  RETURN COALESCE(v_role, 'usuario_comum');
END; $$;

CREATE OR REPLACE FUNCTION public.has_global_platform_role(p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
BEGIN
  IF p_role IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
    AND p.status = 'active' AND p.deleted_at IS NULL AND p.role = p_role) THEN
    RETURN true;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > statement_timestamp())
      AND p.status = 'active' AND p.deleted_at IS NULL
      AND r.code = p_role AND r.is_global = true AND r.tenant_id IS NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
BEGIN
  IF p_tenant_id IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
    AND p.status = 'active' AND p.deleted_at IS NULL) THEN RETURN false; END IF;
  IF public.has_global_platform_role('master') THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.role IN ('admin','tenant_admin','owner','socio_admin')
      AND tm.approved_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id AND ur.status = 'active'
      AND (ur.expires_at IS NULL OR ur.expires_at > statement_timestamp())
      AND r.code IN ('tenant_admin','admin','owner','socio_admin')
      AND ((r.is_global = true AND r.tenant_id IS NULL) OR r.tenant_id = p_tenant_id));
END; $$;

CREATE OR REPLACE FUNCTION public.protect_own_profile_authority_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() = OLD.id THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Campos de autoridade do perfil nao podem ser alterados no autoatendimento' USING ERRCODE = '42501';
    END IF;
    IF (OLD.terms_accepted_at IS NOT NULL AND NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at)
      OR (OLD.privacy_accepted_at IS NOT NULL AND NEW.privacy_accepted_at IS DISTINCT FROM OLD.privacy_accepted_at) THEN
      RAISE EXCEPTION 'Registros de consentimento ja emitidos nao podem ser alterados' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_protect_own_authority_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_own_authority_fields
  BEFORE UPDATE OF id, role, tenant_id, status, deleted_at, terms_accepted_at, privacy_accepted_at
  ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.protect_own_profile_authority_fields();

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_global_platform_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_tenant_admin_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_own_profile_authority_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_platform_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_admin_access(uuid) TO authenticated;

SELECT extensions.plan(1);
SELECT extensions.ok(true, 'P0-B hardening local carregado');
SELECT extensions.finish();
