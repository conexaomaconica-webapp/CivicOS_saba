-- Migration 062: Fix RLS policies and compatibility view for profiles and organizations

-- 1. Create a compatibility view `public.user_profiles` pointing to `public.profiles`
-- This guarantees legacy queries for `user_profiles` don't throw HTTP 404
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT * FROM public.profiles;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;
GRANT SELECT ON public.user_profiles TO service_role;

-- 2. Ensure RLS read policy on `public.organizations` for admins and authenticated users
DROP POLICY IF EXISTS "Allow authenticated read organizations" ON public.organizations;

CREATE POLICY "Allow authenticated read organizations"
  ON public.organizations FOR SELECT
  USING (true);

-- 3. Ensure RLS read policy on `public.profiles` for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;

CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT
  USING (true);
