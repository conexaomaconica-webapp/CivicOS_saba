-- ============================================================================
-- Product Migration: Conexão Maçônica - Identity & Authorization Context (RBAC Estendido)
-- ============================================================================
-- Extends Foundation with granular RBAC: roles, permissions, user_roles, elevated access
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. roles - Papéis no sistema (Globais ou por Tenant)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_global BOOLEAN NOT NULL DEFAULT false,
  role_type TEXT CHECK (role_type IN ('platform', 'operational', 'tenant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices parciais para tratar unicidade de tenant_id NULL vs NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_global_code ON public.roles(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_code ON public.roles(tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE OR REPLACE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. permissions - Catálogo de permissões do sistema
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL, -- ex: 'business:create', 'lead:view_phone', 'crm:manage'
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_permissions_code UNIQUE (code)
);

-- ---------------------------------------------------------------------------
-- 3. role_permissions - Relação entre Papéis e Permissões
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- 4. user_roles - Associação de papéis a usuários dentro de um tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  expires_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_user_roles_tenant_user_role UNIQUE (tenant_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON public.user_roles(tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- 5. elevated_access_sessions - Acesso Elevado de Suporte Master
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.elevated_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID,
  reason TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('support:elevated_access', 'privacy:restricted_data:view', 'financial:cross_tenant:view')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  session_evidence_id UUID
);

CREATE INDEX IF NOT EXISTS idx_elevated_access_user_status ON public.elevated_access_sessions(user_id, status, expires_at);

-- ---------------------------------------------------------------------------
-- Helper Functions para RLS Policies
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_global_platform_role(p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = p_role
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.status = 'active'
        AND (r.is_global = true OR ur.tenant_id IS NULL)
        AND r.code = p_role
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_global_platform_role('master') THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'owner', 'socio_admin')
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = p_tenant_id
        AND ur.status = 'active'
        AND r.code IN ('tenant_admin', 'admin', 'owner', 'socio_admin')
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_business_permission(
  p_tenant_id UUID,
  p_business_id UUID,
  p_roles TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_business_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_tenant_admin_access(p_tenant_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_members'
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevated_access_sessions ENABLE ROW LEVEL SECURITY;

-- roles: master can manage all; tenant_admin can manage tenant-scoped roles
DROP POLICY IF EXISTS "master can manage all roles" ON public.roles;
CREATE POLICY "master can manage all roles"
  ON public.roles
  FOR ALL
  USING (public.has_global_platform_role('master'));

DROP POLICY IF EXISTS "tenant_admin can manage tenant roles" ON public.roles;
CREATE POLICY "tenant_admin can manage tenant roles"
  ON public.roles
  FOR ALL
  USING (
    tenant_id IS NOT NULL 
    AND public.has_tenant_admin_access(tenant_id)
  );

-- permissions: readable by all authenticated; manageable by master
DROP POLICY IF EXISTS "authenticated can view permissions" ON public.permissions;
CREATE POLICY "authenticated can view permissions"
  ON public.permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "master can manage permissions" ON public.permissions;
CREATE POLICY "master can manage permissions"
  ON public.permissions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- role_permissions: master can manage all; tenant_admin can manage tenant-scoped
DROP POLICY IF EXISTS "master can manage role_permissions" ON public.role_permissions;
CREATE POLICY "master can manage role_permissions"
  ON public.role_permissions
  FOR ALL
  USING (public.has_global_platform_role('master'));

DROP POLICY IF EXISTS "tenant_admin can manage tenant role_permissions" ON public.role_permissions;
CREATE POLICY "tenant_admin can manage tenant role_permissions"
  ON public.role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.id = role_id 
      AND r.tenant_id IS NOT NULL 
      AND public.has_tenant_admin_access(r.tenant_id)
    )
  );

-- user_roles: tenant_admin can manage; master can manage all; user can view own
DROP POLICY IF EXISTS "master can manage all user_roles" ON public.user_roles;
CREATE POLICY "master can manage all user_roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_global_platform_role('master'));

DROP POLICY IF EXISTS "tenant_admin can manage tenant user_roles" ON public.user_roles;
CREATE POLICY "tenant_admin can manage tenant user_roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "user can view own user_roles" ON public.user_roles;
CREATE POLICY "user can view own user_roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- elevated_access_sessions: master can manage own; second operator approves
DROP POLICY IF EXISTS "master can manage own elevated_access_sessions" ON public.elevated_access_sessions;
CREATE POLICY "master can manage own elevated_access_sessions"
  ON public.elevated_access_sessions
  FOR ALL
  USING (
    user_id = auth.uid() 
    AND public.has_global_platform_role('master')
  );

DROP POLICY IF EXISTS "approver can approve elevated_access_sessions" ON public.elevated_access_sessions;
CREATE POLICY "approver can approve elevated_access_sessions"
  ON public.elevated_access_sessions
  FOR UPDATE
  USING (
    public.has_global_platform_role('master')
    AND auth.uid() != user_id
  );
