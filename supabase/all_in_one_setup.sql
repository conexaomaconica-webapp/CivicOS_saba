-- ============================================================================
-- CivicOS / Conexão Maçônica - Bundle Completo de Migrations + Seed + Smoke Test
-- ============================================================================
-- Este arquivo unificado permite executar TODO o setup do banco de dados no 
-- Supabase Dashboard (SQL Editor) em uma única execução sequencial.
-- ============================================================================

-- ============================================================================
-- MIGRATION: 001_tenants.sql
-- ============================================================================

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

-- Tenants: public read (portals are resolved by slug for anyone); previously
-- member-only, which also caused infinite recursion via tenant_members (42P17).
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
CREATE POLICY "Public can read tenants"
  ON public.tenants
  FOR SELECT
  USING (true);

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


-- ============================================================================
-- MIGRATION: 002_profiles.sql
-- ============================================================================

-- ============================================================================
-- Core Migration: User Profiles & RBAC
-- ============================================================================
-- Defines roles, profile metadata, RLS, and trigger for auto-creation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'usuario_comum' CHECK (role IN ('master', 'socio_admin', 'anunciante', 'usuario_comum')),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant and role lookup speed
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Auto-update updated_at trigger
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Helper function to fetch role without RLS recursion (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'usuario_comum');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Auto-Creation Trigger on Signup
-- ---------------------------------------------------------------------------
-- Automatically creates a public profile and a tenant membership record 
-- when a user registers. Reads metadata values provided during signUp().

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_tenant_id UUID;
  target_role TEXT;
  target_name TEXT;
BEGIN
  -- Extract metadata from raw_user_meta_data
  target_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    ''
  );
  
  target_role := COALESCE(
    NEW.raw_user_meta_data ->> 'role',
    'usuario_comum'
  );
  
  -- Ensure role is valid
  IF target_role NOT IN ('master', 'socio_admin', 'anunciante', 'usuario_comum') THEN
    target_role := 'usuario_comum';
  END IF;

  -- Extract tenant_id if provided
  BEGIN
    target_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    target_tenant_id := NULL;
  END;

  -- Create public profile
  INSERT INTO public.profiles (id, name, email, role, tenant_id)
  VALUES (NEW.id, target_name, NEW.email, target_role, target_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  -- If a tenant_id was supplied, also establish workspace membership
  IF target_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, NEW.id, target_role)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Read Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Socio admins can view tenant profiles" ON public.profiles;
CREATE POLICY "Socio admins can view tenant profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.get_current_user_role() = 'socio_admin' AND 
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
CREATE POLICY "Masters can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.get_current_user_role() = 'master');

-- 2. Update Policies
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
CREATE POLICY "Users can update own profile fields"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-escalation of roles
  );

DROP POLICY IF EXISTS "Masters can manage all profiles" ON public.profiles;
CREATE POLICY "Masters can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (public.get_current_user_role() = 'master');


-- ============================================================================
-- MIGRATION: 003_business_directory.sql
-- ============================================================================

-- ============================================================================
-- Plugin Migration: Business Directory & Banners (Guia Comercial)
-- ============================================================================
-- Creates schemas for listings, banners, reviews and favorites with strict RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Businesses Table (Empresas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON public.businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);

-- Trigger for auto updated_at
CREATE OR REPLACE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Business Banners Table (Banners de Publicidade)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  target_url TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_tenant ON public.business_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_banners_business ON public.business_banners(business_id);

CREATE OR REPLACE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON public.business_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Business Reviews Table (Comentários e Avaliações)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON public.business_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.business_reviews(business_id);

CREATE OR REPLACE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Business Favorites Table (Favoritos)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_tenant ON public.business_favorites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.business_favorites(user_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS) Configuration
-- ---------------------------------------------------------------------------

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_favorites ENABLE ROW LEVEL SECURITY;

-- --- Businesses (Empresas) Policies ---
DROP POLICY IF EXISTS "Anyone can view businesses within active tenant" ON public.businesses;
CREATE POLICY "Public can read active businesses"
  ON public.businesses
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage own businesses" ON public.businesses;
CREATE POLICY "Owners can manage own businesses"
  ON public.businesses
  FOR ALL
  USING (owner_id = auth.uid() OR public.get_current_user_role() = 'master');

-- --- Banners Policies ---
DROP POLICY IF EXISTS "Anyone can view active banners in active tenant" ON public.business_banners;
CREATE POLICY "Public can read active banners"
  ON public.business_banners
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage banners of their own businesses" ON public.business_banners;
CREATE POLICY "Owners can manage banners of their own businesses"
  ON public.business_banners
  FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR 
    public.get_current_user_role() = 'master'
  );

-- --- Reviews (Avaliações) Policies ---
DROP POLICY IF EXISTS "Anyone can view reviews in active tenant" ON public.business_reviews;
CREATE POLICY "Public can read reviews"
  ON public.business_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Logged in users can post reviews" ON public.business_reviews;
CREATE POLICY "Logged in users can post reviews"
  ON public.business_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Users can manage own reviews" ON public.business_reviews;
CREATE POLICY "Users can manage own reviews"
  ON public.business_reviews
  FOR UPDATE
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'master')
  WITH CHECK (user_id = auth.uid() OR public.get_current_user_role() = 'master');

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.business_reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.business_reviews
  FOR DELETE
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'master');

-- --- Favorites Policies ---
DROP POLICY IF EXISTS "Users can view own favorites" ON public.business_favorites;
CREATE POLICY "Users can view own favorites"
  ON public.business_favorites
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.business_favorites;
CREATE POLICY "Users can manage own favorites"
  ON public.business_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());


-- ============================================================================
-- MIGRATION: 004_plans_and_tiers.sql
-- ============================================================================

-- ============================================================================
-- Migration: Plans and Tiers (Bronze, Prata, Ouro) & Slugs
-- ============================================================================

-- 1. Create tenant_plans table
CREATE TABLE IF NOT EXISTS public.tenant_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'prata', 'ouro')),
  price_annual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant ON public.tenant_plans(tenant_id);

CREATE OR REPLACE TRIGGER trg_tenant_plans_updated_at
  BEFORE UPDATE ON public.tenant_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2. Modify businesses table
ALTER TABLE public.businesses DROP COLUMN IF EXISTS is_premium;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (plan_tier IN ('bronze', 'prata', 'ouro'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add index on slug for routing search performance
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 3. Row-Level Security on tenant_plans
ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select tenant plans" ON public.tenant_plans;
CREATE POLICY "Anyone can select tenant plans"
  ON public.tenant_plans
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage tenant plans" ON public.tenant_plans;
CREATE POLICY "Admins can manage tenant plans"
  ON public.tenant_plans
  FOR ALL
  USING (public.get_current_user_role() IN ('master', 'socio_admin'))
  WITH CHECK (public.get_current_user_role() IN ('master', 'socio_admin'));

-- 4. Prepopulate plans for all existing tenants
INSERT INTO public.tenant_plans (tenant_id, tier, price_annual)
SELECT id, 'bronze', 0.00 FROM public.tenants
ON CONFLICT (tenant_id, tier) DO NOTHING;

INSERT INTO public.tenant_plans (tenant_id, tier, price_annual)
SELECT id, 'prata', 299.00 FROM public.tenants
ON CONFLICT (tenant_id, tier) DO NOTHING;

INSERT INTO public.tenant_plans (tenant_id, tier, price_annual)
SELECT id, 'ouro', 499.00 FROM public.tenants
ON CONFLICT (tenant_id, tier) DO NOTHING;


-- ============================================================================
-- MIGRATION: 005_platform_tenant_context.sql
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);

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
DROP POLICY IF EXISTS "tenant_admin can manage tenant_settings" ON public.tenant_settings;
CREATE POLICY "tenant_admin can manage tenant_settings"
  ON public.tenant_settings
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "master can manage all tenant_settings" ON public.tenant_settings;
CREATE POLICY "master can manage all tenant_settings"
  ON public.tenant_settings
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- tenant_domains: tenant_admin and master can manage
DROP POLICY IF EXISTS "tenant_admin can manage tenant_domains" ON public.tenant_domains;
CREATE POLICY "tenant_admin can manage tenant_domains"
  ON public.tenant_domains
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "master can manage all tenant_domains" ON public.tenant_domains;
CREATE POLICY "master can manage all tenant_domains"
  ON public.tenant_domains
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- tenant_features: tenant_admin and master can manage
DROP POLICY IF EXISTS "tenant_admin can manage tenant_features" ON public.tenant_features;
CREATE POLICY "tenant_admin can manage tenant_features"
  ON public.tenant_features
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "master can manage all tenant_features" ON public.tenant_features;
CREATE POLICY "master can manage all tenant_features"
  ON public.tenant_features
  FOR ALL
  USING (
    public.has_global_platform_role('master')
  );

-- Public read access for tenant_features (for feature flag checks)
DROP POLICY IF EXISTS "Anyone can view tenant_features in active tenant" ON public.tenant_features;
CREATE POLICY "Anyone can view tenant_features in active tenant"
  ON public.tenant_features
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    OR public.get_current_user_role() = 'master'
  );


-- ============================================================================
-- MIGRATION: 006_identity_authorization_rbac.sql
-- ============================================================================

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


-- ============================================================================
-- MIGRATION: 007_directory_context.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Directory Context (Guia de Empresas)
-- ============================================================================
-- Extends Foundation businesses table and adds all directory-related tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Migration em public.businesses (Reutilizada da Foundation)
-- ---------------------------------------------------------------------------

-- Garante chave única composta (tenant_id, id) para integridade relacional de tabelas filhas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_businesses_tenant_id' 
    AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses ADD CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id);
  END IF;
END $$;

-- Adiciona campos estendidos de diretório (SEM plan_tier) com status explícito de publicação
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'commercial' CHECK (company_type IN ('commercial', 'masonic_store', 'service_provider'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'pending_approval', 'published', 'suspended', 'archived'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 2. business_members - Delegação, Convites e Ciclo de Vida
-- Substitui a restrição de proprietário único (owner_id), permitindo múltiplos gestores
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL se convite pendente
  invited_email TEXT,
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_members UNIQUE (business_id, user_id),
  CONSTRAINT fk_business_members_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_invite ON public.business_members(invited_email, invite_token_hash);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. categories - Árvore de categorias
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_global_slug ON public.categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_slug ON public.categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. business_categories
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_categories (
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, category_id),
  CONSTRAINT fk_bus_cat_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 5. business_locations - Endereços com suporte a geolocalização
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Matriz',
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_headquarters BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_loc_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_locations_business ON public.business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_city_state ON public.business_locations(city, state);
CREATE INDEX IF NOT EXISTS idx_business_locations_lat_lng ON public.business_locations(latitude, longitude);

CREATE OR REPLACE TRIGGER trg_business_locations_updated_at
  BEFORE UPDATE ON public.business_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 6. business_contacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'phone', 'email', 'instagram', 'linkedin', 'facebook', 'website')),
  value TEXT NOT NULL,
  label TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_contacts_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 7. business_hours
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_business_hours_day UNIQUE (business_id, day_of_week),
  CONSTRAINT fk_bus_hours_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 8. business_media
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_media_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 9. business_attributes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_attributes_key UNIQUE (business_id, attribute_key),
  CONSTRAINT fk_bus_attr_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_attributes ENABLE ROW LEVEL SECURITY;

-- business_members: business members can view; owner/co_owner can manage
DROP POLICY IF EXISTS "business_members can view own memberships" ON public.business_members;
CREATE POLICY "business_members can view own memberships"
  ON public.business_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "owner_co_owner can manage business_members" ON public.business_members;
CREATE POLICY "owner_co_owner can manage business_members"
  ON public.business_members
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- categories: public read for active tenant; tenant_admin manages
DROP POLICY IF EXISTS "Anyone can view active categories in tenant" ON public.categories;
CREATE POLICY "Anyone can view active categories in tenant"
  ON public.categories
  FOR SELECT
  USING (
    (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
    AND is_active = true
  );

DROP POLICY IF EXISTS "tenant_admin can manage categories" ON public.categories;
CREATE POLICY "tenant_admin can manage categories"
  ON public.categories
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- business_categories: follows business permissions
DROP POLICY IF EXISTS "business_members can view business_categories" ON public.business_categories;
CREATE POLICY "business_members can view business_categories"
  ON public.business_categories
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    OR public.has_tenant_admin_access(tenant_id)
  );

DROP POLICY IF EXISTS "owner_co_owner_manager can manage business_categories" ON public.business_categories;
CREATE POLICY "owner_co_owner_manager can manage business_categories"
  ON public.business_categories
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_locations: public read for published businesses; managers manage
DROP POLICY IF EXISTS "Public can view locations of published businesses" ON public.business_locations;
CREATE POLICY "Public can view locations of published businesses"
  ON public.business_locations
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_locations.business_id
        AND b.tenant_id = business_locations.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "managers can manage business_locations" ON public.business_locations;
CREATE POLICY "managers can manage business_locations"
  ON public.business_locations
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_contacts: similar to locations
DROP POLICY IF EXISTS "Public can view public contacts of published businesses" ON public.business_contacts;
CREATE POLICY "Public can view public contacts of published businesses"
  ON public.business_contacts
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_contacts.business_id
        AND b.tenant_id = business_contacts.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "managers can manage business_contacts" ON public.business_contacts;
CREATE POLICY "managers can manage business_contacts"
  ON public.business_contacts
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_hours: public read for published; managers manage
DROP POLICY IF EXISTS "Public can view hours of published businesses" ON public.business_hours;
CREATE POLICY "Public can view hours of published businesses"
  ON public.business_hours
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_hours.business_id
        AND b.tenant_id = business_hours.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "managers can manage business_hours" ON public.business_hours;
CREATE POLICY "managers can manage business_hours"
  ON public.business_hours
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_media: public read for published; marketing/managers manage
DROP POLICY IF EXISTS "Public can view media of published businesses" ON public.business_media;
CREATE POLICY "Public can view media of published businesses"
  ON public.business_media
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_media.business_id
        AND b.tenant_id = business_media.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "marketing_managers can manage business_media" ON public.business_media;
CREATE POLICY "marketing_managers can manage business_media"
  ON public.business_media
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    OR public.has_tenant_admin_access(tenant_id)
  );

-- business_attributes: similar to contacts
DROP POLICY IF EXISTS "Public can view attributes of published businesses" ON public.business_attributes;
CREATE POLICY "Public can view attributes of published businesses"
  ON public.business_attributes
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_attributes.business_id
        AND b.tenant_id = business_attributes.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "managers can manage business_attributes" ON public.business_attributes;
CREATE POLICY "managers can manage business_attributes"
  ON public.business_attributes
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );


-- ============================================================================
-- MIGRATION: 008_masonic_organizations.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Masonic Organizations Context
-- ============================================================================
-- Domínio Institucional: Organizations, Units, People (MVP 1A)
-- Relationships & Memberships (MVP 1B - created as extensible tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. organizations - Lojas Simbólicas, Potências
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_number INTEGER,
  potency TEXT NOT NULL,
  rite TEXT,
  foundation_date DATE,
  meeting_schedule TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_organizations_tenant_code UNIQUE (tenant_id, potency, code_number),
  CONSTRAINT uq_organizations_tenant_id UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON public.organizations(tenant_id);

CREATE OR REPLACE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. organization_units - Subdivisões (ex: departamentos, comissões)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_units_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_units_org ON public.organization_units(tenant_id, organization_id);

-- ---------------------------------------------------------------------------
-- 3. organization_people - Pessoas vinculadas à instituição
-- Independem de possuir conta ativa no auth.users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional
  full_name TEXT NOT NULL,
  cimb_code TEXT, -- Cadastro institucional
  masonic_degree TEXT,
  role_in_org TEXT NOT NULL DEFAULT 'membro',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'licensed', 'transferred', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_organization_people_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_org_people_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_people_org ON public.organization_people(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_people_user ON public.organization_people(user_id);

-- ---------------------------------------------------------------------------
-- 4. organization_memberships - MVP 1B (Proposta de extensão futura)
-- Vínculo formal de membros/dirigentes com histórico
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  person_id UUID NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_membership_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_membership_person FOREIGN KEY (tenant_id, person_id) REFERENCES public.organization_people(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_person ON public.organization_memberships(person_id);

-- ---------------------------------------------------------------------------
-- 5. organization_relationships - MVP 1B (Proposta de extensão futura)
-- Hierarquias e obediências entre organizações
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_organization_id UUID NOT NULL,
  target_organization_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'subordinate', 'affiliated', 'partner', 'jurisdiction'
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_rel_source FOREIGN KEY (tenant_id, source_organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_rel_target FOREIGN KEY (tenant_id, target_organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_org_rel_no_self CHECK (source_organization_id != target_organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_relationships_source ON public.organization_relationships(tenant_id, source_organization_id);
CREATE INDEX IF NOT EXISTS idx_org_relationships_target ON public.organization_relationships(tenant_id, target_organization_id);

-- ---------------------------------------------------------------------------
-- 6. organization_event_link - MVP 1B (Proposta de extensão futura)
-- Vincula eventos institucionais a organizações
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_event_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  event_id UUID NOT NULL, -- Referência a tabela events (content context)
  link_type TEXT NOT NULL DEFAULT 'organizer', -- 'organizer', 'host', 'participant', 'sponsor'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_event_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_event_link_org ON public.organization_event_link(tenant_id, organization_id);

-- ---------------------------------------------------------------------------
-- 7. organization_business_partnership - MVP 1B (Proposta de extensão futura)
-- Vínculo com empresas conveniadas (businesses do directory)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_business_partnership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  business_id UUID NOT NULL,
  partnership_type TEXT NOT NULL DEFAULT 'conveniada', -- 'conveniada', 'patrocinadora', 'fornecedora'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_biz_partnership_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_org_biz_partnership_biz FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_org_biz_partnership_org ON public.organization_business_partnership(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_org_biz_partnership_biz ON public.organization_business_partnership(tenant_id, business_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_event_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_business_partnership ENABLE ROW LEVEL SECURITY;

-- organizations: public read for active; tenant_admin manages; organization_people with admin role can manage
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
CREATE POLICY "Public can view active organizations"
  ON public.organizations
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
  );

DROP POLICY IF EXISTS "tenant_admin can manage organizations" ON public.organizations;
CREATE POLICY "tenant_admin can manage organizations"
  ON public.organizations
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "organization_admin can manage own organization" ON public.organizations;
CREATE POLICY "organization_admin can manage own organization"
  ON public.organizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organizations.tenant_id
        AND op.organization_id = organizations.id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_units: similar to organizations
DROP POLICY IF EXISTS "Public can view units of active organizations" ON public.organization_units;
CREATE POLICY "Public can view units of active organizations"
  ON public.organization_units
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_units.organization_id
        AND o.tenant_id = organization_units.tenant_id
        AND o.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage units" ON public.organization_units;
CREATE POLICY "tenant_admin and organization_admin can manage units"
  ON public.organization_units
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_units.tenant_id
        AND op.organization_id = organization_units.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_people: public read limited; person can view own; admins manage
DROP POLICY IF EXISTS "Public can view active organization people" ON public.organization_people;
CREATE POLICY "Public can view active organization people"
  ON public.organization_people
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_people.organization_id
        AND o.tenant_id = organization_people.tenant_id
        AND o.is_active = true
    )
  );

DROP POLICY IF EXISTS "Person can view own record" ON public.organization_people;
CREATE POLICY "Person can view own record"
  ON public.organization_people
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage people" ON public.organization_people;
CREATE POLICY "tenant_admin and organization_admin can manage people"
  ON public.organization_people
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_people.tenant_id
        AND op.organization_id = organization_people.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_memberships: admins manage
DROP POLICY IF EXISTS "tenant_admin and organization_admin can manage memberships" ON public.organization_memberships;
CREATE POLICY "tenant_admin and organization_admin can manage memberships"
  ON public.organization_memberships
  FOR ALL
  USING (
    public.has_tenant_admin_access(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_people op
      WHERE op.tenant_id = organization_memberships.tenant_id
        AND op.organization_id = organization_memberships.organization_id
        AND op.user_id = auth.uid()
        AND op.role_in_org IN ('veneravel', 'grande_secretario', 'presidente')
        AND op.status = 'active'
    )
  );

-- organization_relationships: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_relationships" ON public.organization_relationships;
CREATE POLICY "tenant_admin can manage organization_relationships"
  ON public.organization_relationships
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- organization_event_link: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_event_link" ON public.organization_event_link;
CREATE POLICY "tenant_admin can manage organization_event_link"
  ON public.organization_event_link
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- organization_business_partnership: admins manage
DROP POLICY IF EXISTS "tenant_admin can manage organization_business_partnership" ON public.organization_business_partnership;
CREATE POLICY "tenant_admin can manage organization_business_partnership"
  ON public.organization_business_partnership
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));


-- ============================================================================
-- MIGRATION: 009_verification_credentials.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Verification & Credentials Context
-- ============================================================================
-- Selos de verificação, evidências, histórico
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. credential_types - Tipos de Selos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  validity_days INTEGER,
  requires_evidence BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cred_types_global_code ON public.credential_types(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cred_types_tenant_code ON public.credential_types(tenant_id, code) WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. credential_issuances - Credenciais emitidas
-- FKs explícitas e CHECK de exclusividade em substituição ao polimorfismo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES public.credential_types(id) ON DELETE RESTRICT,
  business_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired', 'revoked')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Validação de Anti-Self-Approval
  CONSTRAINT chk_cred_anti_self_approval CHECK (
    status != 'verified' OR verified_by IS NULL OR requested_by IS NULL OR requested_by != verified_by
  ),
  -- Restrição de exclusividade estrita do alvo (apenas um dos três)
  CONSTRAINT chk_credential_target_exclusivity CHECK (
    (business_id IS NOT NULL AND user_id IS NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NOT NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT fk_cred_issuance_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cred_issuance_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credential_issuances_status ON public.credential_issuances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_credential_issuances_business ON public.credential_issuances(tenant_id, business_id);
CREATE INDEX IF NOT EXISTS idx_credential_issuances_user ON public.credential_issuances(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_credential_issuances_org ON public.credential_issuances(tenant_id, organization_id);

CREATE OR REPLACE TRIGGER trg_credential_issuances_updated_at
  BEFORE UPDATE ON public.credential_issuances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. credential_evidence - Evidências/documentos anexados
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'external_link')),
  file_url TEXT NOT NULL,
  file_hash TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_evidence_issuance ON public.credential_evidence(issuance_id);

-- ---------------------------------------------------------------------------
-- 4. credential_history - Histórico de mudanças de status
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_history_issuance ON public.credential_history(issuance_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_history ENABLE ROW LEVEL SECURITY;

-- credential_types: public read for active tenant; tenant_admin manages
DROP POLICY IF EXISTS "Anyone can view credential_types in tenant" ON public.credential_types;
CREATE POLICY "Anyone can view credential_types in tenant"
  ON public.credential_types
  FOR SELECT
  USING (
    (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
  );

DROP POLICY IF EXISTS "tenant_admin can manage credential_types" ON public.credential_types;
CREATE POLICY "tenant_admin can manage credential_types"
  ON public.credential_types
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- credential_issuances: 
-- - Public can view verified credentials for published businesses
-- - Requester can view own pending
-- - Verifier (tenant_admin) can manage all
-- - Business members with credential:evidence:upload can upload evidence
DROP POLICY IF EXISTS "Public can view verified credentials" ON public.credential_issuances;
CREATE POLICY "Public can view verified credentials"
  ON public.credential_issuances
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'verified'
    AND (
      (business_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = credential_issuances.business_id
          AND b.tenant_id = credential_issuances.tenant_id
          AND b.publication_status = 'published'
          AND b.is_active = true
      ))
      OR user_id IS NOT NULL
      OR organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Requester can view own credential_issuances" ON public.credential_issuances;
CREATE POLICY "Requester can view own credential_issuances"
  ON public.credential_issuances
  FOR SELECT
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage all credential_issuances" ON public.credential_issuances;
CREATE POLICY "tenant_admin can manage all credential_issuances"
  ON public.credential_issuances
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Business members can request credentials" ON public.credential_issuances;
CREATE POLICY "Business members can request credentials"
  ON public.credential_issuances
  FOR INSERT
  WITH CHECK (
    business_id IS NOT NULL
    AND public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    AND requested_by = auth.uid()
  );

DROP POLICY IF EXISTS "Verifier can update credential_issuances" ON public.credential_issuances;
CREATE POLICY "Verifier can update credential_issuances"
  ON public.credential_issuances
  FOR UPDATE
  USING (
    public.has_tenant_admin_access(tenant_id)
    AND verified_by != requested_by -- Anti-self-approval enforced by constraint too
  );

-- credential_evidence: requester can upload; verifier can view
DROP POLICY IF EXISTS "Requester can upload evidence" ON public.credential_evidence;
CREATE POLICY "Requester can upload evidence"
  ON public.credential_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_evidence.issuance_id
        AND ci.requested_by = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Verifier and requester can view evidence" ON public.credential_evidence;
CREATE POLICY "Verifier and requester can view evidence"
  ON public.credential_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_evidence.issuance_id
        AND (ci.requested_by = auth.uid() OR public.has_tenant_admin_access(ci.tenant_id))
    )
  );

-- credential_history: requester and verifier can view
DROP POLICY IF EXISTS "Requester and verifier can view credential_history" ON public.credential_history;
CREATE POLICY "Requester and verifier can view credential_history"
  ON public.credential_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_history.issuance_id
        AND (ci.requested_by = auth.uid() OR public.has_tenant_admin_access(ci.tenant_id))
    )
  );


-- ============================================================================
-- MIGRATION: 010_founder_highlights_sponsorships.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Founder, Highlights & Sponsorships
-- ============================================================================
-- Founder qualifications, listing highlights, sponsorships
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. founder_qualifications - Reconhecimento histórico de Fundador
-- Benefícios são concedidos via Entitlements (tabela separada)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.founder_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  founder_number INTEGER NOT NULL,
  qualified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_founder_number UNIQUE (tenant_id, founder_number),
  CONSTRAINT uq_founder_business UNIQUE (business_id),
  CONSTRAINT fk_founder_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_founder_qualifications_tenant ON public.founder_qualifications(tenant_id);

-- ---------------------------------------------------------------------------
-- 2. listing_highlights - Destaques visuais no portal (carrossel, topo de busca)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.listing_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  highlight_type TEXT NOT NULL CHECK (highlight_type IN ('home_carousel', 'category_top', 'search_boost')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_highlights_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_highlights_active ON public.listing_highlights(tenant_id, is_active, start_at, end_at);

-- ---------------------------------------------------------------------------
-- 3. sponsorships - Patrocínio formal de seções, canais ou categorias (MVP 1B)
-- Conceito distinto de destaque comercial de listagem
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  sponsor_scope TEXT NOT NULL CHECK (sponsor_scope IN ('portal_global', 'category', 'event_channel')),
  scope_target_id UUID, -- ID da categoria ou evento patrocinado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sponsorships_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_sponsorships_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_tenant ON public.sponsorships(tenant_id);

-- ---------------------------------------------------------------------------
-- 4. sponsorship_periods - Períodos de patrocínio (MVP 1B)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsorship_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sponsorship_id UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_sponsorship_periods_sponsorship FOREIGN KEY (tenant_id, sponsorship_id) REFERENCES public.sponsorships(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_periods_sponsorship ON public.sponsorship_periods(sponsorship_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.founder_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_periods ENABLE ROW LEVEL SECURITY;

-- founder_qualifications: tenant_admin manages; business_owner can view own
DROP POLICY IF EXISTS "tenant_admin can manage founder_qualifications" ON public.founder_qualifications;
CREATE POLICY "tenant_admin can manage founder_qualifications"
  ON public.founder_qualifications
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Business owner can view own founder_qualification" ON public.founder_qualifications;
CREATE POLICY "Business owner can view own founder_qualification"
  ON public.founder_qualifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = founder_qualifications.tenant_id
        AND bm.business_id = founder_qualifications.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'co_owner')
    )
  );

-- listing_highlights: tenant_admin manages; marketing can create/cancel own business highlights
DROP POLICY IF EXISTS "tenant_admin can manage listing_highlights" ON public.listing_highlights;
CREATE POLICY "tenant_admin can manage listing_highlights"
  ON public.listing_highlights
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Marketing can manage own business highlights" ON public.listing_highlights;
CREATE POLICY "Marketing can manage own business highlights"
  ON public.listing_highlights
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'marketing'])
  );

DROP POLICY IF EXISTS "Public can view active highlights" ON public.listing_highlights;
CREATE POLICY "Public can view active highlights"
  ON public.listing_highlights
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND start_at <= now()
    AND end_at >= now()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = listing_highlights.business_id
        AND b.tenant_id = listing_highlights.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

-- sponsorships: tenant_admin manages
DROP POLICY IF EXISTS "tenant_admin can manage sponsorships" ON public.sponsorships;
CREATE POLICY "tenant_admin can manage sponsorships"
  ON public.sponsorships
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "Public can view active sponsorships" ON public.sponsorships;
CREATE POLICY "Public can view active sponsorships"
  ON public.sponsorships
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.sponsorship_periods sp
      WHERE sp.sponsorship_id = sponsorships.id
        AND sp.is_active = true
        AND sp.start_at <= now()
        AND sp.end_at >= now()
    )
  );

-- sponsorship_periods: tenant_admin manages
DROP POLICY IF EXISTS "tenant_admin can manage sponsorship_periods" ON public.sponsorship_periods;
CREATE POLICY "tenant_admin can manage sponsorship_periods"
  ON public.sponsorship_periods
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));


-- ============================================================================
-- MIGRATION: 011_billing_subscriptions.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Billing & Subscriptions Context (6.7)
-- ============================================================================
-- Planos e assinaturas: plans, plan_versions, subscriptions, subscription_periods,
-- invoices, invoice_items, invoice_status_history, payments, payment_refunds,
-- financial_adjustments, payment_attempts, payment_provider_events.
-- Modelo ADR-002: assinatura contínua lógica + ciclos explícitos (períodos),
-- contrato restrito a contract_term = 'annual' e gateway neutro (provider_code).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. plans - Catálogo abstrato de ofertas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plans_code_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON public.plans(tenant_id);

CREATE OR REPLACE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. plan_versions - Versões imutáveis de preço e regras
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  price_annual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  features_summary JSONB NOT NULL DEFAULT '{}',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_versions UNIQUE (plan_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON public.plan_versions(plan_id);

-- ---------------------------------------------------------------------------
-- 3. subscriptions - Assinaturas de empresas (contrato anual desacoplado)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  plan_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  contract_term TEXT NOT NULL DEFAULT 'annual' CHECK (contract_term IN ('annual')),
  payment_schedule TEXT NOT NULL DEFAULT 'lump_sum' CHECK (payment_schedule IN ('lump_sum', 'installments')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_subscriptions_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON public.subscriptions(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. subscription_periods - Ciclos explícitos da assinatura
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscription_periods_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_sub_periods_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_periods_sub ON public.subscription_periods(tenant_id, subscription_id);

-- ---------------------------------------------------------------------------
-- 5. invoices - Faturas vinculadas ao período de assinatura
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_period_id UUID REFERENCES public.subscription_periods(id) ON DELETE SET NULL,
  business_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'overdue')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 6. invoice_items & invoice_status_history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice ON public.invoice_status_history(invoice_id);

-- ---------------------------------------------------------------------------
-- 7. payments, payment_refunds & financial_adjustments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'bank_slip', 'manual_transfer')),
  provider_code TEXT NOT NULL, -- Neutro (ex: 'asaas', 'stripe', 'manual')
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payments_provider_tx UNIQUE (provider_code, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON public.payment_refunds(payment_id);

CREATE TABLE IF NOT EXISTS public.financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  type TEXT NOT NULL CHECK (type IN ('credit_grant', 'debit_adjustment', 'waiver')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fin_adj_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_business ON public.financial_adjustments(tenant_id, business_id);

-- ---------------------------------------------------------------------------
-- 8. payment_attempts & payment_provider_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
  error_code TEXT,
  error_message TEXT,
  payload_sent JSONB,
  response_received JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice ON public.payment_attempts(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_provider_events UNIQUE (provider_code, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_events_processed ON public.payment_provider_events(provider_code, processed, created_at);


-- ============================================================================
-- MIGRATION: 012_contracts_consent_lgpd.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Contracts & Consent Context (6.8)
-- ============================================================================
-- Aceites LGPD minimizados: legal_documents, legal_document_versions,
-- acceptance_records, consent_records, consent_withdrawals.
-- Evidência técnica minimizada (session_evidence_id) sem persistência ostensiva
-- de IP/User-Agent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. legal_documents & legal_document_versions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_docs_global_code ON public.legal_documents(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_docs_tenant_code ON public.legal_documents(tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_legal_doc_version UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_doc ON public.legal_document_versions(document_id);

-- ---------------------------------------------------------------------------
-- 2. acceptance_records - Evidência técnica minimizada de aceite
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT,
  session_evidence_id TEXT NOT NULL, -- Identificador de sessão auditável
  evidence_metadata JSONB NOT NULL DEFAULT '{}',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acceptance_user ON public.acceptance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_doc ON public.acceptance_records(document_version_id);

-- ---------------------------------------------------------------------------
-- 3. consent_records & consent_withdrawals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_purpose ON public.consent_records(tenant_id, purpose);

CREATE TABLE IF NOT EXISTS public.consent_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES public.consent_records(id) ON DELETE CASCADE,
  reason TEXT,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_withdrawals_consent ON public.consent_withdrawals(consent_id);


-- ============================================================================
-- MIGRATION: 013_entitlements_engine.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Entitlements Engine (6.9)
-- ============================================================================
-- Catálogo, origens e consumo: entitlement_definitions, entitlement_sources,
-- entitlement_grants, entitlement_usage, entitlement_overrides.
-- Benefícios concedidos via origens rastreáveis (plan_version, founder_qualification,
-- campaign, manual_override) com valores tipados e status.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. entitlement_definitions - Catálogo de direitos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric', 'unlimited')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. entitlement_sources - Origem de cada concessão de direito
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('plan_version', 'founder_qualification', 'campaign', 'manual_override')),
  source_reference_id UUID NOT NULL, -- ID da versão do plano, da qualificação de fundador, etc.
  source_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_sources_tenant ON public.entitlement_sources(tenant_id, source_type);

-- ---------------------------------------------------------------------------
-- 3. entitlement_grants - Concessões com colunas tipadas e status
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  entitlement_id UUID NOT NULL REFERENCES public.entitlement_definitions(id) ON DELETE RESTRICT,
  source_id UUID NOT NULL REFERENCES public.entitlement_sources(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  value_boolean BOOLEAN,
  value_numeric INTEGER,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ent_grants_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entitlement_grants_business ON public.entitlement_grants(business_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_grants_entitlement ON public.entitlement_grants(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_grants_status ON public.entitlement_grants(tenant_id, status);

-- ---------------------------------------------------------------------------
-- 4. entitlement_usage & entitlement_overrides - Consumo e sobreposição
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.entitlement_grants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entitlement_usage UNIQUE (grant_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.entitlement_grants(id) ON DELETE CASCADE,
  override_value_numeric INTEGER,
  override_value_boolean BOOLEAN,
  reason TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_grant ON public.entitlement_overrides(grant_id);


-- ============================================================================
-- MIGRATION: 014_crm_internal_sales.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - CRM Interno de Vendas (6.10)
-- ============================================================================
-- Operação da plataforma: crm_pipeline_stages, crm_prospects, crm_opportunities,
-- crm_activities, crm_proposals, crm_renewal_cases.
-- ISOLAMENTO FÍSICO E TENANCY: dados possuem tenant_id para escopo, mas acesso
-- operacional é cross-tenant para a equipe master/admin (tratado na camada RLS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. crm_pipeline_stages, crm_prospects & crm_opportunities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  win_probability NUMERIC(5, 2) DEFAULT 0.00,
  is_terminal_win BOOLEAN NOT NULL DEFAULT false,
  is_terminal_loss BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_tenant ON public.crm_pipeline_stages(tenant_id, display_order);

CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_prospects_tenant ON public.crm_prospects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_agent ON public.crm_prospects(assigned_agent_id);

CREATE OR REPLACE TRIGGER trg_crm_prospects_updated_at
  BEFORE UPDATE ON public.crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  target_plan_id UUID REFERENCES public.plans(id),
  estimated_value NUMERIC(12, 2),
  expected_close_date DATE,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant ON public.crm_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_prospect ON public.crm_opportunities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON public.crm_opportunities(stage_id);

CREATE OR REPLACE TRIGGER trg_crm_opportunities_updated_at
  BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. crm_activities, crm_proposals & crm_renewal_cases
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'meeting', 'whatsapp', 'email', 'note')),
  notes TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity ON public.crm_activities(opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_proposals_opportunity ON public.crm_proposals(opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_renewal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES auth.users(id),
  stage TEXT NOT NULL DEFAULT 'upcoming' CHECK (stage IN ('upcoming', 'in_negotiation', 'renewed', 'churned')),
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_renewal_cases_tenant ON public.crm_renewal_cases(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_renewal_cases_agent ON public.crm_renewal_cases(assigned_agent_id);


-- ============================================================================
-- MIGRATION: 015_leads_advertiser.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Leads do Anunciante (6.11)
-- ============================================================================
-- Exclusivo para mensagens recebidas pelos anunciantes: leads, lead_messages,
-- lead_status_history, lead_consents, lead_conversion_events.
-- ISOLAMENTO FÍSICO CRÍTICO: acesso restrito ao anunciante proprietário da empresa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. leads & lead_messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  origin_channel TEXT NOT NULL DEFAULT 'portal_form' CHECK (origin_channel IN ('portal_form', 'whatsapp_click', 'coupon_claim')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed_won', 'closed_lost', 'archived')),
  has_masonic_regularity_badge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_leads_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_business ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(tenant_id, status, created_at);

CREATE OR REPLACE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'advertiser')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON public.lead_messages(lead_id);

-- ---------------------------------------------------------------------------
-- 2. lead_status_history, lead_consents & lead_conversion_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON public.lead_status_history(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_text TEXT NOT NULL,
  session_evidence_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_consents_lead ON public.lead_consents(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL,
  value NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversion_events_lead ON public.lead_conversion_events(lead_id);


-- ============================================================================
-- MIGRATION: 016_content_banners_coupons_notifications.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Content, Banners, Cupons & Notificações (6.12)
-- ============================================================================
-- banners (MVP 1A); notification_templates, notifications, notification_deliveries
-- (MVP 1A); coupons, coupon_redemptions, articles, events, popups (MVP 1B).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. banners (MVP 1A)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  position TEXT NOT NULL DEFAULT 'home_top' CHECK (position IN ('home_top', 'sidebar', 'category_banner')),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(tenant_id, position, is_active, start_at, end_at);

-- ---------------------------------------------------------------------------
-- 2. notification_templates, notifications & notification_deliveries (MVP 1A)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'push')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON public.notification_templates(tenant_id, code);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
  provider_response JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification ON public.notification_deliveries(notification_id);

-- ---------------------------------------------------------------------------
-- 3. coupons, coupon_redemptions, articles, events & popups (MVP 1B)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  discount_percentage NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_redemptions INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coupons_code UNIQUE (tenant_id, business_id, code),
  CONSTRAINT fk_coupons_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coupons_business ON public.coupons(tenant_id, business_id);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validation_code TEXT UNIQUE NOT NULL,
  CONSTRAINT uq_single_user_coupon UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(tenant_id, is_published, published_at);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON public.events(tenant_id, start_at);

CREATE TABLE IF NOT EXISTS public.popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popups_active ON public.popups(tenant_id, is_active, start_at, end_at);


-- ============================================================================
-- MIGRATION: 017_import_framework.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Import Framework (6.13)
-- ============================================================================
-- Carga em lote por planilha: import_jobs, import_files, import_rows,
-- import_errors, import_execution_history.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. import_jobs, import_files & import_rows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('businesses', 'members', 'organizations')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant ON public.import_jobs(tenant_id, created_at);

CREATE OR REPLACE TRIGGER trg_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_checksum TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_files_job ON public.import_files(job_id);

CREATE TABLE IF NOT EXISTS public.import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  deduplication_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'imported', 'failed')),
  target_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_rows_job ON public.import_rows(job_id, status);

-- ---------------------------------------------------------------------------
-- 2. import_errors & import_execution_history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_id UUID REFERENCES public.import_rows(id) ON DELETE CASCADE,
  column_name TEXT,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_errors_job ON public.import_errors(job_id);

CREATE TABLE IF NOT EXISTS public.import_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  execution_details JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_execution_history_job ON public.import_execution_history(job_id);


-- ============================================================================
-- MIGRATION: 018_analytics_audit.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Analytics & Audit Context (6.14)
-- ============================================================================
-- audit_logs, analytics_events (telemetria pseudonimizada), business_metric_rollups.
-- NOTA: outbox_events (6.14.3) é criado na migration 016 (Messaging & Event
-- Operations Context — 6.17), que define o modelo completo de mensageria com
-- DLQ e projeção sanitizada. A versão simplificada 6.14.3 é superseded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. audit_logs - Trilha de auditoria
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  session_evidence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON public.audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. analytics_events & business_metric_rollups
-- Telemetria pseudonimizada (sem fixar algoritmo SHA-256 prematuramente).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  pseudonymous_subject_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_business_date ON public.analytics_events(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_event ON public.analytics_events(tenant_id, event_name, created_at);

CREATE TABLE IF NOT EXISTS public.business_metric_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  phone_views INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_business_metric_date UNIQUE (business_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_business_metric_rollups_date ON public.business_metric_rollups(business_id, metric_date);


-- ============================================================================
-- MIGRATION: 019_masonic_business_link.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Masonic Business Link Policy (6.15)
-- ============================================================================
-- Vínculos comerciais com integridade composta multi-tenant (tenant_id, id) e
-- preservação histórica de auditoria (ON DELETE SET NULL em atores).
-- DDL conceitual promovido a executável na Migration Review (INF-001).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. business_masonic_links
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  declaring_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link_type TEXT NOT NULL CHECK (link_type IN (
    'owner', 'equity_partner', 'family_owner', 'employee',
    'executive', 'sales_representative', 'authorized_agent', 'institutional_partner'
  )),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_verification', 'under_review', 'correction_requested',
    'approved', 'active', 'rejected', 'suspended', 'expired', 'revoked'
  )),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nota: A chave composta UNIQUE (tenant_id, id) existe exclusivamente para permitir FKs compostas nas tabelas filhas preservando o isolamento multi-tenant.
  CONSTRAINT uq_bml_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_bml_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bml_tenant_business ON public.business_masonic_links(tenant_id, business_id);
-- Garantia de no máximo 1 vínculo principal ativo por empresa por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_bml_primary_per_business ON public.business_masonic_links (tenant_id, business_id) WHERE (is_primary = true AND status = 'active');

CREATE OR REPLACE TRIGGER trg_business_masonic_links_updated_at
  BEFORE UPDATE ON public.business_masonic_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. business_masonic_link_evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'agreement_doc')),
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmle_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmle_link ON public.business_masonic_link_evidence(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 3. business_masonic_link_authorizations (Registro Empresarial Auditável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  authorized_by_name TEXT NOT NULL,
  authorized_by_role TEXT NOT NULL,
  authorization_type TEXT NOT NULL CHECK (authorization_type IN ('owner_declaration', 'corporate_resolution', 'partner_agreement')),
  authorization_scope TEXT NOT NULL CHECK (authorization_scope IN ('company_listing', 'brand_usage', 'member_discount', 'commercial_contact', 'campaign_participation', 'coupon_management')),
  evidence_reference_id UUID REFERENCES public.business_masonic_link_evidence(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  CONSTRAINT fk_bmla_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmla_link ON public.business_masonic_link_authorizations(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 4. business_masonic_link_publication_consents (Consentimento Granular LGPD)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_publication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  visibility_scope TEXT NOT NULL DEFAULT 'authenticated_members' CHECK (visibility_scope IN ('public_all', 'authenticated_members', 'private_admin')),
  display_name BOOLEAN NOT NULL DEFAULT true,
  display_business_role BOOLEAN NOT NULL DEFAULT true,
  display_masonic_role BOOLEAN NOT NULL DEFAULT true,
  display_organization BOOLEAN NOT NULL DEFAULT true,
  display_organization_unit BOOLEAN NOT NULL DEFAULT true,
  display_contact BOOLEAN NOT NULL DEFAULT false,
  display_profile_photo BOOLEAN NOT NULL DEFAULT false,
  display_masonic_degree BOOLEAN NOT NULL DEFAULT false, -- Desabilitado no MVP 1A/1B
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlpc_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlpc_link ON public.business_masonic_link_publication_consents(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 5. business_masonic_link_contests (Entidade Formal de Contestação)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reason_code TEXT NOT NULL CHECK (reason_code IN ('false_claim', 'unauthorized_brand', 'revoked_membership', 'impersonation', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'response_submitted', 'decided', 'appealed', 'closed')),
  response_deadline TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision TEXT CHECK (decision IN ('upheld_link_removed', 'rejected_link_maintained', 'correction_required')),
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  appeal_status TEXT CHECK (appeal_status IN ('none', 'pending', 'decided')),
  appealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlc_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlc_link ON public.business_masonic_link_contests(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 6. business_masonic_link_history (Audit Trail Imutável Ampliado)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- ex: status_change, primary_toggled, consent_updated, contest_opened
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_fields TEXT[], -- Campos alterados para facilitar diffs e auditorias sem parsing de JSON
  previous_data JSONB,
  new_data JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_reason TEXT,
  correlation_id UUID,
  source TEXT NOT NULL DEFAULT 'user_action',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlh_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlh_link ON public.business_masonic_link_history(tenant_id, link_id, created_at);


-- ============================================================================
-- MIGRATION: 020_messaging_outbox_dlq.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - Messaging & Event Operations Context (6.17)
-- ============================================================================
-- Outbox Pattern + DLQ (Infraestrutura assíncrona; base do INF-003/CTL-006):
-- outbox_events (registro imutável), event_deliveries, event_delivery_attempts,
-- event_consumptions, failed_event_queue (DLQ auditável) e a projeção sanitizada
-- vw_operational_dlq_sanitized.
--
-- NOTA DE CONCILIAÇÃO: Doc 02 §6.14.3 define uma versão simplificada de
-- `outbox_events` (coluna published). Esta migration implementa o modelo completo
-- do §6.17 (event sourcing + DLQ), promovendo o DDL conceitual a executável na
-- Migration Review. A versão simplificada fica superseded.
--
-- RLS na tabela base failed_event_queue (requisito do §6.17 para a view) é
-- habilitado no INF-002 (Políticas RLS), conforme split do backlog.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. outbox_events (Registro Imutável de Eventos do Sistema)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  event_version TEXT NOT NULL DEFAULT '1.0',
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INT NOT NULL DEFAULT 1,
  producer TEXT NOT NULL,
  correlation_id TEXT,
  causation_id TEXT,
  trace_id TEXT,
  actor_type TEXT, -- 'user', 'system', 'api_key'
  actor_id TEXT,   -- Referência mínima ao ator sem duplicação de PII
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, dispatched, failed
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_processing ON public.outbox_events(status, available_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON public.outbox_events(tenant_id, event_type);

-- ---------------------------------------------------------------------------
-- 2. event_deliveries (Estado Atual de Entrega por Consumidor)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  attempt_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_event_delivery_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 3. event_delivery_attempts (Histórico Imutável de Tentativas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.event_deliveries(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  attempt_number INT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- success, failed
  error_stack TEXT,
  CONSTRAINT unq_delivery_attempt_seq UNIQUE (delivery_id, attempt_number),
  CONSTRAINT chk_attempt_num_positive CHECK (attempt_number > 0),
  CONSTRAINT chk_exec_time_non_negative CHECK (execution_time_ms >= 0)
);

-- ---------------------------------------------------------------------------
-- 4. event_consumptions (Registro de Execução Concluída e Idempotência)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT NOT NULL DEFAULT 0,
  result_status TEXT NOT NULL DEFAULT 'success', -- success, skipped_idempotent
  CONSTRAINT unq_event_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 5. failed_event_queue (Dead Letter Queue — DLQ Auditável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.failed_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  payload_redacted JSONB NOT NULL,
  first_failed_at TIMESTAMPTZ NOT NULL,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_stack TEXT,
  retry_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_operator_action', -- requires_operator_action, replaying, discarded, resolved
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT unq_dlq_event_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 6. Índices Operacionais Obrigatórios (poling do Worker e inspeção da DLQ)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_outbox_poll ON public.outbox_events(status, available_at, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_consumer ON public.event_deliveries(event_id, consumer_name);
CREATE INDEX IF NOT EXISTS idx_deliveries_retry ON public.event_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_attempts_delivery_seq ON public.event_delivery_attempts(delivery_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_dlq_tenant_status ON public.failed_event_queue(tenant_id, status, last_failed_at);

-- ---------------------------------------------------------------------------
-- 7. Projeção Sanitizada para Inspeção Operacional (vw_operational_dlq_sanitized)
-- Impede acesso direto de Tenant Admin às tabelas base da Outbox.
-- Avalia RLS via a tabela subjacente failed_event_queue (habilitada no INF-002).
-- ---------------------------------------------------------------------------

CREATE VIEW public.vw_operational_dlq_sanitized
WITH (security_invoker = true) AS
SELECT
  dlq.id AS dlq_id,
  dlq.event_id,
  dlq.tenant_id,
  dlq.consumer_name,
  dlq.payload_redacted,
  dlq.first_failed_at,
  dlq.last_failed_at,
  dlq.retry_count,
  dlq.status,
  dlq.resolution_notes
FROM public.failed_event_queue dlq;

-- Grants restritos à View
GRANT SELECT ON public.vw_operational_dlq_sanitized TO authenticated;
GRANT ALL ON public.vw_operational_dlq_sanitized TO service_role;


-- ============================================================================
-- MIGRATION: 021_rls_billing.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Billing & Subscriptions (007)
-- ============================================================================
-- Isolamento multi-tenant por tenant_id + acesso de business members via
-- has_business_permission. FKs compostas (tenant_id, ...) nas policies de SELECT
-- para reforçar o isolamento entre tenants.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- plans & plan_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active plans in tenant" ON public.plans;
CREATE POLICY "Public can view active plans in tenant"
  ON public.plans
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_active = true);

DROP POLICY IF EXISTS "tenant_admin can manage plans" ON public.plans;
CREATE POLICY "tenant_admin can manage plans"
  ON public.plans
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all plans" ON public.plans;
CREATE POLICY "master can manage all plans"
  ON public.plans
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view plan_versions of active plans" ON public.plan_versions;
CREATE POLICY "Public can view plan_versions of active plans"
  ON public.plan_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_versions.plan_id
        AND p.tenant_id = public.current_tenant_id()
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage plan_versions" ON public.plan_versions;
CREATE POLICY "tenant_admin can manage plan_versions"
  ON public.plan_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_versions.plan_id
        AND public.has_tenant_admin_access(p.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all plan_versions" ON public.plan_versions;
CREATE POLICY "master can manage all plan_versions"
  ON public.plan_versions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- subscriptions & subscription_periods
-- ---------------------------------------------------------------------------

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Business members can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business owners can manage own subscriptions" ON public.subscriptions;
CREATE POLICY "Business owners can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant subscriptions" ON public.subscriptions;
CREATE POLICY "tenant_admin can manage tenant subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "master can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own subscription_periods" ON public.subscription_periods;
CREATE POLICY "Business members can view own subscription_periods"
  ON public.subscription_periods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.tenant_id = subscription_periods.tenant_id
        AND s.id = subscription_periods.subscription_id
        AND public.has_business_permission(s.tenant_id, s.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "Business owners can manage own subscription_periods" ON public.subscription_periods;
CREATE POLICY "Business owners can manage own subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.tenant_id = subscription_periods.tenant_id
        AND s.id = subscription_periods.subscription_id
        AND public.has_business_permission(s.tenant_id, s.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage subscription_periods" ON public.subscription_periods;
CREATE POLICY "tenant_admin can manage subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all subscription_periods" ON public.subscription_periods;
CREATE POLICY "master can manage all subscription_periods"
  ON public.subscription_periods
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- invoices & invoice_items & invoice_status_history
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoices" ON public.invoices;
CREATE POLICY "Business members can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business owners and finance can manage own invoices" ON public.invoices;
CREATE POLICY "Business owners and finance can manage own invoices"
  ON public.invoices
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant invoices" ON public.invoices;
CREATE POLICY "tenant_admin can manage tenant invoices"
  ON public.invoices
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all invoices" ON public.invoices;
CREATE POLICY "master can manage all invoices"
  ON public.invoices
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoice_items" ON public.invoice_items;
CREATE POLICY "Business members can view own invoice_items"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "Business owners and finance can manage own invoice_items" ON public.invoice_items;
CREATE POLICY "Business owners and finance can manage own invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage invoice_items" ON public.invoice_items;
CREATE POLICY "tenant_admin can manage invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all invoice_items" ON public.invoice_items;
CREATE POLICY "master can manage all invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.invoice_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "Business members can view own invoice_status_history"
  ON public.invoice_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_status_history.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "tenant_admin can manage invoice_status_history"
  ON public.invoice_status_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_status_history.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all invoice_status_history" ON public.invoice_status_history;
CREATE POLICY "master can manage all invoice_status_history"
  ON public.invoice_status_history
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- payments & payment_refunds & payment_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own payments" ON public.payments;
CREATE POLICY "Business members can view own payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payments" ON public.payments;
CREATE POLICY "tenant_admin can manage payments"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payments" ON public.payments;
CREATE POLICY "master can manage all payments"
  ON public.payments
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business finance can view own payment_refunds" ON public.payment_refunds;
CREATE POLICY "Business finance can view own payment_refunds"
  ON public.payment_refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments pay
      JOIN public.invoices i ON i.id = pay.invoice_id
      WHERE pay.id = payment_refunds.payment_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'finance'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payment_refunds" ON public.payment_refunds;
CREATE POLICY "tenant_admin can manage payment_refunds"
  ON public.payment_refunds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.payments pay
      JOIN public.invoices i ON i.id = pay.invoice_id
      WHERE pay.id = payment_refunds.payment_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payment_refunds" ON public.payment_refunds;
CREATE POLICY "master can manage all payment_refunds"
  ON public.payment_refunds
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own payment_attempts" ON public.payment_attempts;
CREATE POLICY "Business members can view own payment_attempts"
  ON public.payment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payment_attempts.invoice_id
        AND public.has_business_permission(i.tenant_id, i.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage payment_attempts" ON public.payment_attempts;
CREATE POLICY "tenant_admin can manage payment_attempts"
  ON public.payment_attempts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payment_attempts.invoice_id
        AND public.has_tenant_admin_access(i.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all payment_attempts" ON public.payment_attempts;
CREATE POLICY "master can manage all payment_attempts"
  ON public.payment_attempts
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- financial_adjustments & payment_provider_events
-- ---------------------------------------------------------------------------

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business finance can view own financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "Business finance can view own financial_adjustments"
  ON public.financial_adjustments
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'finance'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "tenant_admin can manage financial_adjustments"
  ON public.financial_adjustments
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all financial_adjustments" ON public.financial_adjustments;
CREATE POLICY "master can manage all financial_adjustments"
  ON public.financial_adjustments
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;

-- Webhooks/eventos do provedor: acesso restrito a service_role e operadores da plataforma
-- Tabela sem tenant_id: restrita a service_role e operadores master da plataforma
-- para evitar vazamento cross-tenant via webhooks de provedores.
DROP POLICY IF EXISTS "master can manage payment_provider_events" ON public.payment_provider_events;
CREATE POLICY "master can manage payment_provider_events"
  ON public.payment_provider_events
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 022_rls_contracts_entitlements.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Contracts/LGPD (008) + Entitlements (009)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 008: legal_documents & legal_document_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view legal_documents in tenant" ON public.legal_documents;
CREATE POLICY "Public can view legal_documents in tenant"
  ON public.legal_documents
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage legal_documents" ON public.legal_documents;
CREATE POLICY "tenant_admin can manage legal_documents"
  ON public.legal_documents
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all legal_documents" ON public.legal_documents;
CREATE POLICY "master can manage all legal_documents"
  ON public.legal_documents
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view legal_document_versions in tenant" ON public.legal_document_versions;
CREATE POLICY "Public can view legal_document_versions in tenant"
  ON public.legal_document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_documents d
      WHERE d.id = legal_document_versions.document_id
        AND (d.tenant_id IS NULL OR d.tenant_id = public.current_tenant_id())
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "tenant_admin can manage legal_document_versions"
  ON public.legal_document_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_documents d
      WHERE d.id = legal_document_versions.document_id
        AND public.has_tenant_admin_access(d.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "master can manage all legal_document_versions"
  ON public.legal_document_versions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 008: acceptance_records (evidência de aceite LGPD)
-- ---------------------------------------------------------------------------

ALTER TABLE public.acceptance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own acceptance_records" ON public.acceptance_records;
CREATE POLICY "User can view own acceptance_records"
  ON public.acceptance_records
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can create own acceptance_records" ON public.acceptance_records;
CREATE POLICY "User can create own acceptance_records"
  ON public.acceptance_records
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage acceptance_records of tenant" ON public.acceptance_records;
CREATE POLICY "tenant_admin can manage acceptance_records of tenant"
  ON public.acceptance_records
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all acceptance_records" ON public.acceptance_records;
CREATE POLICY "master can manage all acceptance_records"
  ON public.acceptance_records
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 008: consent_records & consent_withdrawals
-- ---------------------------------------------------------------------------

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own consent_records" ON public.consent_records;
CREATE POLICY "User can view own consent_records"
  ON public.consent_records
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can create own consent_records" ON public.consent_records;
CREATE POLICY "User can create own consent_records"
  ON public.consent_records
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_admin can manage consent_records of tenant" ON public.consent_records;
CREATE POLICY "tenant_admin can manage consent_records of tenant"
  ON public.consent_records
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all consent_records" ON public.consent_records;
CREATE POLICY "master can manage all consent_records"
  ON public.consent_records
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.consent_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "User can view own consent_withdrawals"
  ON public.consent_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "User can create own consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "User can create own consent_withdrawals"
  ON public.consent_withdrawals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage consent_withdrawals of tenant" ON public.consent_withdrawals;
CREATE POLICY "tenant_admin can manage consent_withdrawals of tenant"
  ON public.consent_withdrawals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.consent_records c
      WHERE c.id = consent_withdrawals.consent_id
        AND public.has_tenant_admin_access(c.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all consent_withdrawals" ON public.consent_withdrawals;
CREATE POLICY "master can manage all consent_withdrawals"
  ON public.consent_withdrawals
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_definitions (catálogo global/por tenant)
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can view entitlement_definitions" ON public.entitlement_definitions;
CREATE POLICY "authenticated can view entitlement_definitions"
  ON public.entitlement_definitions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "master can manage entitlement_definitions" ON public.entitlement_definitions;
CREATE POLICY "master can manage entitlement_definitions"
  ON public.entitlement_definitions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_sources
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_sources" ON public.entitlement_sources;
CREATE POLICY "tenant_admin can manage entitlement_sources"
  ON public.entitlement_sources
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all entitlement_sources" ON public.entitlement_sources;
CREATE POLICY "master can manage all entitlement_sources"
  ON public.entitlement_sources
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "Business members can view own entitlement_grants"
  ON public.entitlement_grants
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "tenant_admin can manage entitlement_grants"
  ON public.entitlement_grants
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all entitlement_grants" ON public.entitlement_grants;
CREATE POLICY "master can manage all entitlement_grants"
  ON public.entitlement_grants
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 009: entitlement_usage & entitlement_overrides
-- ---------------------------------------------------------------------------

ALTER TABLE public.entitlement_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "Business members can view own entitlement_usage"
  ON public.entitlement_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_usage.grant_id
        AND public.has_business_permission(g.tenant_id, g.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "tenant_admin can manage entitlement_usage"
  ON public.entitlement_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_usage.grant_id
        AND public.has_tenant_admin_access(g.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all entitlement_usage" ON public.entitlement_usage;
CREATE POLICY "master can manage all entitlement_usage"
  ON public.entitlement_usage
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.entitlement_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage entitlement_overrides" ON public.entitlement_overrides;
CREATE POLICY "tenant_admin can manage entitlement_overrides"
  ON public.entitlement_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entitlement_grants g
      WHERE g.id = entitlement_overrides.grant_id
        AND public.has_tenant_admin_access(g.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all entitlement_overrides" ON public.entitlement_overrides;
CREATE POLICY "master can manage all entitlement_overrides"
  ON public.entitlement_overrides
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 023_rls_crm_leads.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: CRM Interno (010) + Leads (011)
-- ============================================================================
-- CRM: acesso operacional cross-tenant para equipe master/admin da plataforma
-- (Doc 02 §6.10) + tenant_admin no escopo do próprio tenant.
-- Leads: ISOLAMENTO FÍSICO CRÍTICO — somente o anunciante (business members)
-- acessa os leads recebidos de sua empresa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 010: crm_pipeline_stages
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage crm_pipeline_stages" ON public.crm_pipeline_stages;
CREATE POLICY "tenant_admin can manage crm_pipeline_stages"
  ON public.crm_pipeline_stages
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_pipeline_stages" ON public.crm_pipeline_stages;
CREATE POLICY "master can manage all crm_pipeline_stages"
  ON public.crm_pipeline_stages
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_prospects
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_prospects" ON public.crm_prospects;
CREATE POLICY "Assigned agent can view own crm_prospects"
  ON public.crm_prospects
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_prospects" ON public.crm_prospects;
CREATE POLICY "tenant_admin can manage crm_prospects"
  ON public.crm_prospects
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_prospects" ON public.crm_prospects;
CREATE POLICY "master can manage all crm_prospects"
  ON public.crm_prospects
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_opportunities
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "Assigned agent can view own crm_opportunities"
  ON public.crm_opportunities
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "tenant_admin can manage crm_opportunities"
  ON public.crm_opportunities
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "master can manage all crm_opportunities"
  ON public.crm_opportunities
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_activities (sem tenant_id próprio; acesso via opportunity)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performing agent can view own crm_activities" ON public.crm_activities;
CREATE POLICY "Performing agent can view own crm_activities"
  ON public.crm_activities
  FOR SELECT
  USING (performed_by = auth.uid());

DROP POLICY IF EXISTS "Agent can manage own crm_activities" ON public.crm_activities;
CREATE POLICY "Agent can manage own crm_activities"
  ON public.crm_activities
  FOR ALL
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_opportunities o
      WHERE o.id = crm_activities.opportunity_id
        AND public.has_tenant_admin_access(o.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all crm_activities" ON public.crm_activities;
CREATE POLICY "master can manage all crm_activities"
  ON public.crm_activities
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_proposals (via opportunity)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage crm_proposals" ON public.crm_proposals;
CREATE POLICY "tenant_admin can manage crm_proposals"
  ON public.crm_proposals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_opportunities o
      WHERE o.id = crm_proposals.opportunity_id
        AND public.has_tenant_admin_access(o.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all crm_proposals" ON public.crm_proposals;
CREATE POLICY "master can manage all crm_proposals"
  ON public.crm_proposals
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_renewal_cases
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_renewal_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "Assigned agent can view own crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "tenant_admin can manage crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "master can manage all crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 011: leads (anunciante) — ISOLAMENTO FÍSICO CRÍTICO
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender can view leads they submitted" ON public.leads;
CREATE POLICY "Sender can view leads they submitted"
  ON public.leads
  FOR SELECT
  USING (sender_user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own business leads" ON public.leads;
CREATE POLICY "Business members can view own business leads"
  ON public.leads
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business members can manage own business leads" ON public.leads;
CREATE POLICY "Business members can manage own business leads"
  ON public.leads
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant leads" ON public.leads;
CREATE POLICY "tenant_admin can manage tenant leads"
  ON public.leads
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all leads" ON public.leads;
CREATE POLICY "master can manage all leads"
  ON public.leads
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 011: lead_messages, lead_status_history, lead_consents, lead_conversion_events
-- (todos seguem o acesso da lead pai)
-- ---------------------------------------------------------------------------

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_messages" ON public.lead_messages;
CREATE POLICY "Users with access to lead can view lead_messages"
  ON public.lead_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_messages.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_messages" ON public.lead_messages;
CREATE POLICY "Business members can manage lead_messages"
  ON public.lead_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_messages.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_messages" ON public.lead_messages;
CREATE POLICY "master can manage all lead_messages"
  ON public.lead_messages
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_status_history" ON public.lead_status_history;
CREATE POLICY "Users with access to lead can view lead_status_history"
  ON public.lead_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_history.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_status_history" ON public.lead_status_history;
CREATE POLICY "Business members can manage lead_status_history"
  ON public.lead_status_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_history.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_status_history" ON public.lead_status_history;
CREATE POLICY "master can manage all lead_status_history"
  ON public.lead_status_history
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_consents" ON public.lead_consents;
CREATE POLICY "Users with access to lead can view lead_consents"
  ON public.lead_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_consents.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_consents" ON public.lead_consents;
CREATE POLICY "Business members can manage lead_consents"
  ON public.lead_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_consents.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_consents" ON public.lead_consents;
CREATE POLICY "master can manage all lead_consents"
  ON public.lead_consents
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "Users with access to lead can view lead_conversion_events"
  ON public.lead_conversion_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_conversion_events.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "Business members can manage lead_conversion_events"
  ON public.lead_conversion_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_conversion_events.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "master can manage all lead_conversion_events"
  ON public.lead_conversion_events
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 024_rls_content_import.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Content (012) + Import (013)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 012: banners
-- ---------------------------------------------------------------------------

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners in tenant" ON public.banners;
CREATE POLICY "Public can view active banners in tenant"
  ON public.banners
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at >= now())
  );

DROP POLICY IF EXISTS "tenant_admin can manage banners" ON public.banners;
CREATE POLICY "tenant_admin can manage banners"
  ON public.banners
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all banners" ON public.banners;
CREATE POLICY "master can manage all banners"
  ON public.banners
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: notification_templates
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage notification_templates" ON public.notification_templates;
CREATE POLICY "tenant_admin can manage notification_templates"
  ON public.notification_templates
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all notification_templates" ON public.notification_templates;
CREATE POLICY "master can manage all notification_templates"
  ON public.notification_templates
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: notifications & notification_deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own notifications" ON public.notifications;
CREATE POLICY "User can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can manage own notifications" ON public.notifications;
CREATE POLICY "User can manage own notifications"
  ON public.notifications
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage tenant notifications" ON public.notifications;
CREATE POLICY "tenant_admin can manage tenant notifications"
  ON public.notifications
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all notifications" ON public.notifications;
CREATE POLICY "master can manage all notifications"
  ON public.notifications
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "User can view own notification_deliveries"
  ON public.notification_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "tenant_admin can manage notification_deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND public.has_tenant_admin_access(n.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all notification_deliveries" ON public.notification_deliveries;
CREATE POLICY "master can manage all notification_deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: coupons (anunciante) & coupon_redemptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons of published businesses" ON public.coupons;
CREATE POLICY "Public can view active coupons of published businesses"
  ON public.coupons
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = coupons.tenant_id
        AND b.id = coupons.business_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "Business marketing can manage own coupons" ON public.coupons;
CREATE POLICY "Business marketing can manage own coupons"
  ON public.coupons
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant coupons" ON public.coupons;
CREATE POLICY "tenant_admin can manage tenant coupons"
  ON public.coupons
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all coupons" ON public.coupons;
CREATE POLICY "master can manage all coupons"
  ON public.coupons
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "User can view own coupon_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User can redeem coupon" ON public.coupon_redemptions;
CREATE POLICY "User can redeem coupon"
  ON public.coupon_redemptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Business members can view own coupon_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_redemptions.coupon_id
        AND public.has_business_permission(c.tenant_id, c.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "tenant_admin can manage coupon_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_redemptions.coupon_id
        AND public.has_tenant_admin_access(c.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "master can manage all coupon_redemptions"
  ON public.coupon_redemptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 012: articles, events & popups (conteúdo institucional)
-- ---------------------------------------------------------------------------

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published articles in tenant" ON public.articles;
CREATE POLICY "Public can view published articles in tenant"
  ON public.articles
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_published = true);

DROP POLICY IF EXISTS "tenant_admin can manage articles" ON public.articles;
CREATE POLICY "tenant_admin can manage articles"
  ON public.articles
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all articles" ON public.articles;
CREATE POLICY "master can manage all articles"
  ON public.articles
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published events in tenant" ON public.events;
CREATE POLICY "Public can view published events in tenant"
  ON public.events
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_published = true);

DROP POLICY IF EXISTS "tenant_admin can manage events" ON public.events;
CREATE POLICY "tenant_admin can manage events"
  ON public.events
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all events" ON public.events;
CREATE POLICY "master can manage all events"
  ON public.events
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active popups in tenant" ON public.popups;
CREATE POLICY "Public can view active popups in tenant"
  ON public.popups
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at >= now())
  );

DROP POLICY IF EXISTS "tenant_admin can manage popups" ON public.popups;
CREATE POLICY "tenant_admin can manage popups"
  ON public.popups
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all popups" ON public.popups;
CREATE POLICY "master can manage all popups"
  ON public.popups
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 013: import_jobs, import_files, import_rows, import_errors, import_execution_history
-- ---------------------------------------------------------------------------

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator can view own import_jobs" ON public.import_jobs;
CREATE POLICY "Creator can view own import_jobs"
  ON public.import_jobs
  FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage import_jobs" ON public.import_jobs;
CREATE POLICY "tenant_admin can manage import_jobs"
  ON public.import_jobs
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all import_jobs" ON public.import_jobs;
CREATE POLICY "master can manage all import_jobs"
  ON public.import_jobs
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_files" ON public.import_files;
CREATE POLICY "Users with access to job can view import_files"
  ON public.import_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_files.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_files" ON public.import_files;
CREATE POLICY "tenant_admin can manage import_files"
  ON public.import_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_files.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_files" ON public.import_files;
CREATE POLICY "master can manage all import_files"
  ON public.import_files
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_rows" ON public.import_rows;
CREATE POLICY "Users with access to job can view import_rows"
  ON public.import_rows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_rows.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_rows" ON public.import_rows;
CREATE POLICY "tenant_admin can manage import_rows"
  ON public.import_rows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_rows.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_rows" ON public.import_rows;
CREATE POLICY "master can manage all import_rows"
  ON public.import_rows
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_errors" ON public.import_errors;
CREATE POLICY "Users with access to job can view import_errors"
  ON public.import_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_errors.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_errors" ON public.import_errors;
CREATE POLICY "tenant_admin can manage import_errors"
  ON public.import_errors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_errors.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_errors" ON public.import_errors;
CREATE POLICY "master can manage all import_errors"
  ON public.import_errors
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.import_execution_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to job can view import_execution_history" ON public.import_execution_history;
CREATE POLICY "Users with access to job can view import_execution_history"
  ON public.import_execution_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_execution_history.job_id
        AND (j.created_by = auth.uid() OR public.has_tenant_admin_access(j.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage import_execution_history" ON public.import_execution_history;
CREATE POLICY "tenant_admin can manage import_execution_history"
  ON public.import_execution_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.import_jobs j
      WHERE j.id = import_execution_history.job_id
        AND public.has_tenant_admin_access(j.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all import_execution_history" ON public.import_execution_history;
CREATE POLICY "master can manage all import_execution_history"
  ON public.import_execution_history
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 025_rls_analytics_audit.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Analytics & Audit (014)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs (trilha de auditoria — acesso operacional restrito)
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can view audit_logs of tenant" ON public.audit_logs;
CREATE POLICY "tenant_admin can view audit_logs of tenant"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all audit_logs" ON public.audit_logs;
CREATE POLICY "master can manage all audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- analytics_events (telemetria pseudonimizada)
-- ---------------------------------------------------------------------------

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view analytics_events of own business" ON public.analytics_events;
CREATE POLICY "Business members can view analytics_events of own business"
  ON public.analytics_events
  FOR SELECT
  USING (
    business_id IS NOT NULL
    AND public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "tenant_admin can view analytics_events of tenant" ON public.analytics_events;
CREATE POLICY "tenant_admin can view analytics_events of tenant"
  ON public.analytics_events
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all analytics_events" ON public.analytics_events;
CREATE POLICY "master can manage all analytics_events"
  ON public.analytics_events
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_metric_rollups (métricas agregadas — leitura pública)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_metric_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view metric_rollups of published businesses" ON public.business_metric_rollups;
CREATE POLICY "Public can view metric_rollups of published businesses"
  ON public.business_metric_rollups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_metric_rollups.business_id
        AND b.tenant_id = public.current_tenant_id()
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage business_metric_rollups" ON public.business_metric_rollups;
CREATE POLICY "tenant_admin can manage business_metric_rollups"
  ON public.business_metric_rollups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_metric_rollups.business_id
        AND public.has_tenant_admin_access(b.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all business_metric_rollups" ON public.business_metric_rollups;
CREATE POLICY "master can manage all business_metric_rollups"
  ON public.business_metric_rollups
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 026_rls_masonic_business_link.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Masonic Business Link (015)
-- ============================================================================
-- Vínculo comercial declarado: isolamento multi-tenant + ciclo de aprovação.
-- Público: somente vínculos aprovados/ativos de empresas publicadas.
-- Evidências e consentimentos são sensíveis: acesso restrito a declarante,
-- business members, tenant_admin e master.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- business_masonic_links
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved active links of published businesses" ON public.business_masonic_links;
CREATE POLICY "Public can view approved active links of published businesses"
  ON public.business_masonic_links
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status IN ('approved', 'active')
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = business_masonic_links.tenant_id
        AND b.id = business_masonic_links.business_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "Declaring user can view own links" ON public.business_masonic_links;
CREATE POLICY "Declaring user can view own links"
  ON public.business_masonic_links
  FOR SELECT
  USING (declaring_user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own business links" ON public.business_masonic_links;
CREATE POLICY "Business members can view own business links"
  ON public.business_masonic_links
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Declaring user and business owners can manage own links" ON public.business_masonic_links;
CREATE POLICY "Declaring user and business owners can manage own links"
  ON public.business_masonic_links
  FOR ALL
  USING (
    declaring_user_id = auth.uid()
    OR public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant business_masonic_links" ON public.business_masonic_links;
CREATE POLICY "tenant_admin can manage tenant business_masonic_links"
  ON public.business_masonic_links
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all business_masonic_links" ON public.business_masonic_links;
CREATE POLICY "master can manage all business_masonic_links"
  ON public.business_masonic_links
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_evidence (armazenamento privado — acesso auditado)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "Users with access to link can view evidence"
  ON public.business_masonic_link_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Declaring user can upload evidence for own links" ON public.business_masonic_link_evidence;
CREATE POLICY "Declaring user can upload evidence for own links"
  ON public.business_masonic_link_evidence
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "tenant_admin can manage evidence"
  ON public.business_masonic_link_evidence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_evidence.tenant_id
        AND bml.id = business_masonic_link_evidence.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all evidence" ON public.business_masonic_link_evidence;
CREATE POLICY "master can manage all evidence"
  ON public.business_masonic_link_evidence
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_authorizations (registro empresarial auditável)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "Users with access to link can view authorizations"
  ON public.business_masonic_link_authorizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'support', 'viewer'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business owners and declaring user can manage authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "Business owners and declaring user can manage authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "tenant_admin can manage authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_authorizations.tenant_id
        AND bml.id = business_masonic_link_authorizations.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all authorizations" ON public.business_masonic_link_authorizations;
CREATE POLICY "master can manage all authorizations"
  ON public.business_masonic_link_authorizations
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_publication_consents (consentimento granular LGPD)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_publication_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Declaring user can view own consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "Declaring user can view own consents"
  ON public.business_masonic_link_publication_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND bml.declaring_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Declaring user can manage own consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "Declaring user can manage own consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager']))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "tenant_admin can manage consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_publication_consents.tenant_id
        AND bml.id = business_masonic_link_publication_consents.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all consents" ON public.business_masonic_link_publication_consents;
CREATE POLICY "master can manage all consents"
  ON public.business_masonic_link_publication_consents
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_contests (entidade formal de contestação)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_contests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Opener can view own contests" ON public.business_masonic_link_contests;
CREATE POLICY "Opener can view own contests"
  ON public.business_masonic_link_contests
  FOR SELECT
  USING (opened_by = auth.uid());

DROP POLICY IF EXISTS "Users with access to link can view contests" ON public.business_masonic_link_contests;
CREATE POLICY "Users with access to link can view contests"
  ON public.business_masonic_link_contests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_contests.tenant_id
        AND bml.id = business_masonic_link_contests.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage contests" ON public.business_masonic_link_contests;
CREATE POLICY "tenant_admin can manage contests"
  ON public.business_masonic_link_contests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_contests.tenant_id
        AND bml.id = business_masonic_link_contests.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all contests" ON public.business_masonic_link_contests;
CREATE POLICY "master can manage all contests"
  ON public.business_masonic_link_contests
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_masonic_link_history (audit trail imutável)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_masonic_link_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to link can view history" ON public.business_masonic_link_history;
CREATE POLICY "Users with access to link can view history"
  ON public.business_masonic_link_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_history.tenant_id
        AND bml.id = business_masonic_link_history.link_id
        AND (bml.declaring_user_id = auth.uid()
             OR public.has_business_permission(bml.tenant_id, bml.business_id, ARRAY['owner', 'co_owner', 'manager', 'support', 'viewer'])
             OR public.has_tenant_admin_access(bml.tenant_id))
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage history" ON public.business_masonic_link_history;
CREATE POLICY "tenant_admin can manage history"
  ON public.business_masonic_link_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_masonic_links bml
      WHERE bml.tenant_id = business_masonic_link_history.tenant_id
        AND bml.id = business_masonic_link_history.link_id
        AND public.has_tenant_admin_access(bml.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all history" ON public.business_masonic_link_history;
CREATE POLICY "master can manage all history"
  ON public.business_masonic_link_history
  FOR ALL
  USING (public.has_global_platform_role('master'));


-- ============================================================================
-- MIGRATION: 027_rls_messaging_outbox_dlq.sql
-- ============================================================================

-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Messaging & Event Operations (016)
-- ============================================================================
-- Outbox/DLQ: acesso exclusivo via service_role (worker) e master. A única via
-- de acesso para autenticados é a projeção sanitizada vw_operational_dlq_sanitized
-- (CTL-006), que avalia RLS via a tabela base failed_event_queue (security_invoker).
--
-- Requisito obrigatório do Doc 02 §6.17: failed_event_queue com RLS habilitada
-- E FORÇADA (FORCE), impedindo acesso direto do owner sem política.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- outbox_events (registro imutável de eventos)
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage outbox_events" ON public.outbox_events;
CREATE POLICY "master can manage outbox_events"
  ON public.outbox_events
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_deliveries" ON public.event_deliveries;
CREATE POLICY "master can manage event_deliveries"
  ON public.event_deliveries
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_delivery_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_delivery_attempts" ON public.event_delivery_attempts;
CREATE POLICY "master can manage event_delivery_attempts"
  ON public.event_delivery_attempts
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_consumptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_consumptions" ON public.event_consumptions;
CREATE POLICY "master can manage event_consumptions"
  ON public.event_consumptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- failed_event_queue (DLQ) — RLS habilitada e forçada
-- ---------------------------------------------------------------------------

ALTER TABLE public.failed_event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_event_queue FORCE ROW LEVEL SECURITY;

-- Habilita a projeção sanitizada vw_operational_dlq_sanitized para tenant admins
-- no escopo do próprio tenant (security_invoker avalia esta policy).
DROP POLICY IF EXISTS "tenant_admin can view failed_event_queue of own tenant" ON public.failed_event_queue;
CREATE POLICY "tenant_admin can view failed_event_queue of own tenant"
  ON public.failed_event_queue
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage failed_event_queue" ON public.failed_event_queue;
CREATE POLICY "master can manage failed_event_queue"
  ON public.failed_event_queue
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- Privilégio base necessário para a view security_invoker funcionar em
-- autenticados (supabase sem auto_expose_new_tables não concede por padrão).
-- A sanitização é garantida pela projeção da view (payload_redacted, sem
-- error_stack/resolution internas) + RLS forçada (apenas linhas do próprio tenant).
GRANT SELECT ON public.failed_event_queue TO authenticated;


-- ============================================================================
-- MIGRATION: 028_business_registration_fields.sql
-- ============================================================================

-- ============================================================================
-- ADV-002: Registration fields for the advertiser onboarding (CRIT-VSC-003)
-- ============================================================================
-- Adds CNPJ + legal name (razão social) to businesses so the W2 step can
-- persist the advertiser draft and enforce algorithmic/duplicate checks.
-- ============================================================================

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- CNPJ must be stored normalized (14 digits only).
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS chk_businesses_cnpj_digits;
ALTER TABLE public.businesses ADD CONSTRAINT chk_businesses_cnpj_digits
  CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');

-- Duplicity verification: one active CNPJ per tenant (CRIT-VSC-003).
CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_cnpj_tenant
  ON public.businesses (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_cnpj ON public.businesses (cnpj);


-- ============================================================================
-- SEED DATA (Fixtures de Teste & Desenvolvimento)
-- ============================================================================

-- ============================================================================
-- CivicOS - Conexão Maçônica · Seed de Desenvolvimento (Sprint 0 · INF-001)
-- ============================================================================
-- Rodado após as migrations (supabase db reset / db seed). Cria fixtures
-- determinísticas (UUIDs fixos) para o tenant master, tenant demo, usuários de
-- teste, planos e categorias — base para o smoke do Gate 1 e para a suíte RLS.
--
-- NOTA: a trigger `handle_new_user` cria `profiles` e `tenant_members`
-- automaticamente a partir de `raw_user_meta_data`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenants
-- ---------------------------------------------------------------------------

INSERT INTO public.tenants (id, name, slug, settings)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CivicOS Master', 'civicos-master', '{"is_platform_root": true}'),
  ('00000000-0000-0000-0000-000000000010', 'Grande Oriente de SP', 'grande-oriente-sp', '{}'),
  ('00000000-0000-0000-0000-000000000011', 'Loja Luz do Oriente', 'luz-do-oriente', '{}')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Usuários (auth.users) — a trigger cria profiles + tenant_members
-- ---------------------------------------------------------------------------

-- Master (Eduardo / superadministrador da plataforma)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000101',
  'authenticated', 'authenticated', 'master@civicos.local',
  crypt('senha-master-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"master","tenant_id":"00000000-0000-0000-0000-000000000001"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Admin do tenant demo (socio_admin → atende has_tenant_admin_access)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000102',
  'authenticated', 'authenticated', 'admin@demo.local',
  crypt('senha-admin-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"socio_admin","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Usuário anunciante comum do tenant demo
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000103',
  'authenticated', 'authenticated', 'anunciante@demo.local',
  crypt('senha-anunciante-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"anunciante","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Planos dos tenants (migration 004 só popula tenants existentes)
-- ---------------------------------------------------------------------------

INSERT INTO public.tenant_plans (tenant_id, tier, price_annual)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'bronze', 0.00),
  ('00000000-0000-0000-0000-000000000010', 'prata', 299.00),
  ('00000000-0000-0000-0000-000000000010', 'ouro', 499.00),
  ('00000000-0000-0000-0000-000000000011', 'bronze', 0.00)
ON CONFLICT (tenant_id, tier) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Configuração operacional do tenant demo
-- ---------------------------------------------------------------------------

INSERT INTO public.tenant_settings (tenant_id, support_email, whatsapp_number, timezone, currency)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'admin@demo.local', '+5511999999999', 'America/Sao_Paulo', 'BRL')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'directory.enabled', true),
  ('00000000-0000-0000-0000-000000000010', 'billing.enabled', true)
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Categorias globais (tenant_id NULL)
-- ---------------------------------------------------------------------------

INSERT INTO public.categories (tenant_id, parent_id, name, slug, icon, display_order, is_active)
VALUES
  (NULL, NULL, 'Alimentos e Bebidas', 'alimentos-e-bebidas', 'utensils', 10, true),
  (NULL, NULL, 'Artesanato', 'artesanato', 'hand', 20, true),
  (NULL, NULL, 'Imóveis e Construção', 'imoveis-e-construcao', 'building', 30, true),
  (NULL, NULL, 'Saúde e Bem-estar', 'saude-e-bem-estar', 'heart', 40, true),
  (NULL, NULL, 'Serviços', 'servicos', 'briefcase', 50, true)
ON CONFLICT (slug) WHERE tenant_id IS NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Empresa demo publicada
-- ---------------------------------------------------------------------------

INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Padaria Estrela', 'Padaria artesanal com tradição familiar.', 'alimentos-e-bebidas',
  NULL, '+5511988887777', 'contato@padariaestrela.local', 'https://padariaestrela.local', 'Rua das Flores, 123',
  'ouro', 'padaria-estrela', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
SELECT
  b.tenant_id, b.id,
  c.id,
  true
FROM public.businesses b
JOIN public.categories c ON c.slug = 'alimentos-e-bebidas' AND c.tenant_id IS NULL
WHERE b.id = '00000000-0000-0000-0000-000000000201'
ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO public.business_members (tenant_id, business_id, user_id, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000103', 'owner', 'active')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- ============================================================================
-- GATE 1 SMOKE TEST (Validação de Integridade do Schema)
-- ============================================================================

-- ============================================================================
-- CivicOS - Conexão Maçônica · Smoke do Gate 1 (INF-001/002/003)
-- ============================================================================
-- Verifica, após `db reset` + seed, que as pré-condições estruturais do
-- Sprint 0 existem. Qualquer falha levanta exceção (exit != 0).
-- ============================================================================

DO $$
DECLARE
  missing TEXT[] := '{}';
BEGIN
  -- 1. Tabelas-base esperadas após todas as migrations
  IF to_regclass('public.tenants') IS NULL THEN missing := missing || 'tenants'; END IF;
  IF to_regclass('public.profiles') IS NULL THEN missing := missing || 'profiles'; END IF;
  IF to_regclass('public.businesses') IS NULL THEN missing := missing || 'businesses'; END IF;
  IF to_regclass('public.tenant_plans') IS NULL THEN missing := missing || 'tenant_plans'; END IF;

  -- 2. Contexto do produto (Conexão Maçônica)
  IF to_regclass('public.roles') IS NULL THEN missing := missing || 'roles'; END IF;
  IF to_regclass('public.permissions') IS NULL THEN missing := missing || 'permissions'; END IF;
  IF to_regclass('public.user_roles') IS NULL THEN missing := missing || 'user_roles'; END IF;
  IF to_regclass('public.business_members') IS NULL THEN missing := missing || 'business_members'; END IF;
  IF to_regclass('public.categories') IS NULL THEN missing := missing || 'categories'; END IF;
  IF to_regclass('public.organizations') IS NULL THEN missing := missing || 'organizations'; END IF;
  IF to_regclass('public.credential_issuances') IS NULL THEN missing := missing || 'credential_issuances'; END IF;
  IF to_regclass('public.entitlement_grants') IS NULL THEN missing := missing || 'entitlement_grants'; END IF;
  IF to_regclass('public.consent_records') IS NULL THEN missing := missing || 'consent_records'; END IF;
  IF to_regclass('public.legal_documents') IS NULL THEN missing := missing || 'legal_documents'; END IF;
  IF to_regclass('public.subscriptions') IS NULL THEN missing := missing || 'subscriptions'; END IF;
  IF to_regclass('public.plans') IS NULL THEN missing := missing || 'plans'; END IF;
  IF to_regclass('public.leads') IS NULL THEN missing := missing || 'leads'; END IF;
  IF to_regclass('public.business_masonic_links') IS NULL THEN missing := missing || 'business_masonic_links'; END IF;
  IF to_regclass('public.import_jobs') IS NULL THEN missing := missing || 'import_jobs'; END IF;
  IF to_regclass('public.audit_logs') IS NULL THEN missing := missing || 'audit_logs'; END IF;

  -- 3. Mensageria/Outbox + DLQ (INF-003)
  IF to_regclass('public.outbox_events') IS NULL THEN missing := missing || 'outbox_events'; END IF;
  IF to_regclass('public.event_deliveries') IS NULL THEN missing := missing || 'event_deliveries'; END IF;
  IF to_regclass('public.failed_event_queue') IS NULL THEN missing := missing || 'failed_event_queue'; END IF;
  IF to_regclass('public.event_consumptions') IS NULL THEN missing := missing || 'event_consumptions'; END IF;

  -- 4. Funções de segurança (INF-004)
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_global_platform_role')
    THEN missing := missing || 'fn:has_global_platform_role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_tenant_admin_access')
    THEN missing := missing || 'fn:has_tenant_admin_access'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_business_permission')
    THEN missing := missing || 'fn:has_business_permission'; END IF;

  -- 5. Seed aplicado (fixtures determinísticas)
  IF (SELECT count(*) FROM public.tenants) < 3 THEN missing := missing || 'seed:tenants'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'master')
    THEN missing := missing || 'seed:master-user'; END IF;
  IF (SELECT count(*) FROM public.businesses) < 1 THEN missing := missing || 'seed:business'; END IF;
  IF (SELECT count(*) FROM public.tenant_plans WHERE tenant_id = '00000000-0000-0000-0000-000000000010') < 3
    THEN missing := missing || 'seed:tenant-plans'; END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'GATE1 SMOKE FAILED - ausentes: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'GATE1 SMOKE OK - schema, segurança, outbox e seed presentes';
END $$;

