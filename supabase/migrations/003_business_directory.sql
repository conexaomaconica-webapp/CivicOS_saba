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
CREATE POLICY "Anyone can view businesses within active tenant"
  ON public.businesses
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.get_current_user_role() = 'master');

CREATE POLICY "Owners can manage own businesses"
  ON public.businesses
  FOR ALL
  USING (owner_id = auth.uid() OR public.get_current_user_role() = 'master');

-- --- Banners Policies ---
CREATE POLICY "Anyone can view active banners in active tenant"
  ON public.business_banners
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_active = true OR public.get_current_user_role() = 'master');

CREATE POLICY "Owners can manage banners of their own businesses"
  ON public.business_banners
  FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR 
    public.get_current_user_role() = 'master'
  );

-- --- Reviews (Avaliações) Policies ---
CREATE POLICY "Anyone can view reviews in active tenant"
  ON public.business_reviews
  FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.get_current_user_role() = 'master');

CREATE POLICY "Logged in users can post reviews"
  ON public.business_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.current_tenant_id());

CREATE POLICY "Users can manage own reviews"
  ON public.business_reviews
  FOR UPDATE
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'master')
  WITH CHECK (user_id = auth.uid() OR public.get_current_user_role() = 'master');

CREATE POLICY "Users can delete own reviews"
  ON public.business_reviews
  FOR DELETE
  USING (user_id = auth.uid() OR public.get_current_user_role() = 'master');

-- --- Favorites Policies ---
CREATE POLICY "Users can view own favorites"
  ON public.business_favorites
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own favorites"
  ON public.business_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.current_tenant_id());
