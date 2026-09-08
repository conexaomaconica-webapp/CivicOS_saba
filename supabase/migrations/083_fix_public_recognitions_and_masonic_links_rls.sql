-- Migration 083: Fix Public RLS for Recognitions, Masonic Links and User Role Function
-- 1. Grant execute on get_current_user_role to anon & public (prevents RLS permission denied errors)
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated, service_role, PUBLIC;

-- 2. Update RLS policy on business_masonic_links to include 'verified' status
DROP POLICY IF EXISTS "Public can view approved active links of published businesses" ON public.business_masonic_links;
CREATE POLICY "Public can view approved active links of published businesses"
  ON public.business_masonic_links
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('approved', 'active', 'verified')
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_masonic_links.business_id
        AND (b.publication_status = 'published' OR b.is_published = true)
        AND b.is_active = true
    )
  );

-- 3. Update RLS policy on business_recognitions to allow public read for published businesses
DROP POLICY IF EXISTS "Public read active business_recognitions" ON public.business_recognitions;
CREATE POLICY "Public read active business_recognitions"
  ON public.business_recognitions FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_recognitions.business_id
        AND b.is_active = true
        AND (b.publication_status = 'published' OR b.is_published = true)
    )
  );

-- 4. Create public.business_responsibles table for owner profile & lodge persistence
CREATE TABLE IF NOT EXISTS public.business_responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    business_role TEXT DEFAULT 'Proprietário',
    community_label TEXT DEFAULT 'Ir.''.',
    organization TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_responsibles_tenant_biz UNIQUE (tenant_id, business_id),
    CONSTRAINT fk_business_responsibles_business FOREIGN KEY (business_id, tenant_id) REFERENCES public.businesses(id, tenant_id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_responsibles TO anon, authenticated, service_role;
ALTER TABLE public.business_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read business_responsibles" ON public.business_responsibles;
CREATE POLICY "Public read business_responsibles"
  ON public.business_responsibles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manage business_responsibles" ON public.business_responsibles;
CREATE POLICY "Admin manage business_responsibles"
  ON public.business_responsibles FOR ALL
  TO authenticated, service_role
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
