-- Certificações de mercado (ISO etc.) exibidas por empresas do Plano Acácia.
-- NÃO são reconhecimentos institucionais (Pedra Fundamental, Fundadora, Coluna de Honra):
-- são selos de terceiros, cadastrados pelo admin no Prontuário 360 (apenas a logo).
-- Escrita: somente via service role (server actions do admin). Leitura pública: empresas publicadas.

CREATE TABLE IF NOT EXISTS public.business_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_bus_certifications_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_certifications_lookup
  ON public.business_certifications(tenant_id, business_id, display_order);

ALTER TABLE public.business_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view certifications of published businesses" ON public.business_certifications;
CREATE POLICY "Public can view certifications of published businesses"
  ON public.business_certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_certifications.business_id
        AND b.tenant_id = business_certifications.tenant_id
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

GRANT SELECT ON public.business_certifications TO anon, authenticated;
GRANT ALL ON public.business_certifications TO service_role;
