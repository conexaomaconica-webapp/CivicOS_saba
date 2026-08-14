-- ============================================================================
-- 035 — Public directory reads (white-label portals)
-- ============================================================================
-- The guia (public directory) resolves tenants by slug and lists businesses,
-- banners and reviews for anonymous visitors. The previous SELECT policies
-- gated reads on `current_tenant_id()` (JWT) or tenant membership, so:
--
--   1. Anonymous requests could never resolve a tenant (portals are public);
--   2. The tenants SELECT policy chained into `tenant_members`, which declared
--      a self-referential policy ("Members can view fellow members") causing
--      PostgreSQL error 42P17 (infinite recursion) for anonymous queries.
--
-- This migration makes read access public for the directory surfaces while
-- keeping every write policy (owners/admins/masters) untouched.
-- ============================================================================

-- --- Tenants: public read (portals are resolved by slug for anyone) ---
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
CREATE POLICY "Public can read tenants"
  ON public.tenants
  FOR SELECT
  USING (true);

-- --- Businesses: public read of active listings (public directory) ---
DROP POLICY IF EXISTS "Anyone can view businesses within active tenant" ON public.businesses;
CREATE POLICY "Public can read active businesses"
  ON public.businesses
  FOR SELECT
  USING (is_active = true);

-- --- Banners: public read of active banners ---
DROP POLICY IF EXISTS "Anyone can view active banners in active tenant" ON public.business_banners;
CREATE POLICY "Public can read active banners"
  ON public.business_banners
  FOR SELECT
  USING (is_active = true);

-- --- Reviews: public read (aggregate ratings shown on the guia detail page) ---
DROP POLICY IF EXISTS "Anyone can view reviews in active tenant" ON public.business_reviews;
CREATE POLICY "Public can read reviews"
  ON public.business_reviews
  FOR SELECT
  USING (true);