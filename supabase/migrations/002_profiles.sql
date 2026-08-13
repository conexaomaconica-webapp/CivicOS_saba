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
