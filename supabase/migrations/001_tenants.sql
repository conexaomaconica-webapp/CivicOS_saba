-- ============================================================================
-- Core Migration: Tenants & Plugin Registry
-- ============================================================================
-- These tables are owned by the Core and should NEVER be modified by plugins.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for slug lookups (tenant resolution)
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Tenant Plugin Registry
-- ---------------------------------------------------------------------------
-- Tracks which plugins are enabled per tenant, with per-tenant config.

CREATE TABLE IF NOT EXISTS public.tenant_plugins (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, plugin_id)
);

CREATE OR REPLACE TRIGGER trg_tenant_plugins_updated_at
  BEFORE UPDATE ON public.tenant_plugins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Tenant Members
-- ---------------------------------------------------------------------------
-- Maps auth.users to tenants with role assignment.

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user
  ON public.tenant_members (user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant
  ON public.tenant_members (tenant_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Tenants: users can only see tenants they are members of
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
CREATE POLICY "Users can view own tenants"
  ON public.tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Tenant plugins: viewable by tenant members
DROP POLICY IF EXISTS "Members can view tenant plugins" ON public.tenant_plugins;
CREATE POLICY "Members can view tenant plugins"
  ON public.tenant_plugins
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Tenant members: viewable by fellow members
DROP POLICY IF EXISTS "Members can view fellow members" ON public.tenant_members;
CREATE POLICY "Members can view fellow members"
  ON public.tenant_members
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Admin-only write policies
DROP POLICY IF EXISTS "Admins can manage tenant settings" ON public.tenants;
CREATE POLICY "Admins can manage tenant settings"
  ON public.tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage plugins" ON public.tenant_plugins;
CREATE POLICY "Admins can manage plugins"
  ON public.tenant_plugins
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Helper function: Get current tenant ID from JWT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
