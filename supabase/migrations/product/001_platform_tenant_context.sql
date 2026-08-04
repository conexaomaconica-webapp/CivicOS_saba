-- ============================================================================
-- Product Migration: Conexão Maçônica - Platform & Tenant Context
-- ============================================================================
-- Extends Foundation tables with product-specific tenant configuration
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. tenant_settings - Configurações operacionais estendidas do tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  support_email TEXT,
  whatsapp_number TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  currency TEXT NOT NULL DEFAULT 'BRL',
  allow_self_registration BOOLEAN NOT NULL DEFAULT true,
  require_masonic_verification_for_listing BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_settings_tenant UNIQUE (tenant_id)
);

CREATE OR REPLACE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. tenant_domains - Subdomínios e domínios customizados (White Label)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  ssl_status TEXT NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_domains_domain UNIQUE (domain)
);

CREATE INDEX idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);

CREATE OR REPLACE TRIGGER trg_tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. tenant_features - Feature Flags por tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_features_key UNIQUE (tenant_id, feature_key)
);

CREATE OR REPLACE TRIGGER trg_tenant_features_updated_at
  BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

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

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- tenant_settings: tenant_admin and master can manage
CREATE POLICY "tenant_admin can manage tenant_settings"
  ON public.tenant_settings
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

CREATE POLICY "master can manage all tenant_settings"
  ON public.tenant_settings
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- tenant_domains: tenant_admin and master can manage
CREATE POLICY "tenant_admin can manage tenant_domains"
  ON public.tenant_domains
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

CREATE POLICY "master can manage all tenant_domains"
  ON public.tenant_domains
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- tenant_features: tenant_admin and master can manage
CREATE POLICY "tenant_admin can manage tenant_features"
  ON public.tenant_features
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

CREATE POLICY "master can manage all tenant_features"
  ON public.tenant_features
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- Public read access for tenant_features (for feature flag checks)
CREATE POLICY "Anyone can view tenant_features in active tenant"
  ON public.tenant_features
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    OR public.get_current_user_role() = 'master'
  );