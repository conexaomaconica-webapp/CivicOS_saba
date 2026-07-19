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

CREATE POLICY "Anyone can select tenant plans"
  ON public.tenant_plans
  FOR SELECT
  USING (true);

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
