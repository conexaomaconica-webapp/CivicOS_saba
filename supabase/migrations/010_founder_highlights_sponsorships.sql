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
