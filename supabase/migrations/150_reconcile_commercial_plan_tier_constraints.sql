-- Reconcilia constraints legadas sem apagar ou reclassificar dados históricos.
ALTER TABLE public.tenant_plans
  DROP CONSTRAINT IF EXISTS tenant_plans_tier_check;
ALTER TABLE public.tenant_plans
  ADD CONSTRAINT tenant_plans_tier_check
  CHECK (tier IN ('esquadro', 'compasso', 'acacia')) NOT VALID;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_plan_tier_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_plan_tier_check
  CHECK (plan_tier IN ('esquadro', 'compasso', 'acacia')) NOT VALID;
