-- Migration 128: Commercial Onboarding Terms (Fase 3: Microetapa 3.2)
-- CivicOS SABA / Conexão Maçônica
-- Persiste a intenção e os termos comerciais conferidos e congelados antes da geração de contrato.

CREATE TABLE IF NOT EXISTS public.business_commercial_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  billing_cycle VARCHAR(30) NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('annual', 'biennial')),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'avista' CHECK (payment_method IN ('avista', 'parcelado')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  installments_count INTEGER NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
  installment_amount_cents INTEGER NOT NULL DEFAULT 0,
  is_pedra_fundamental BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'conferido' CHECK (status IN ('conferido', 'desatualizado', 'contratado')),
  conferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conferred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_commercial_terms_business UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_commercial_terms_business ON public.business_commercial_terms(business_id);
CREATE INDEX IF NOT EXISTS idx_business_commercial_terms_tenant ON public.business_commercial_terms(tenant_id);

-- RLS
ALTER TABLE public.business_commercial_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full manage commercial terms" ON public.business_commercial_terms;
CREATE POLICY "Service role full manage commercial terms"
  ON public.business_commercial_terms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users view own commercial terms" ON public.business_commercial_terms;
CREATE POLICY "Authenticated users view own commercial terms"
  ON public.business_commercial_terms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_commercial_terms.business_id
        AND (b.owner_id = auth.uid() OR public.has_platform_admin_access())
    )
  );

DROP POLICY IF EXISTS "Platform admin full manage commercial terms" ON public.business_commercial_terms;
CREATE POLICY "Platform admin full manage commercial terms"
  ON public.business_commercial_terms
  FOR ALL
  TO authenticated
  USING (public.has_platform_admin_access())
  WITH CHECK (public.has_platform_admin_access());
