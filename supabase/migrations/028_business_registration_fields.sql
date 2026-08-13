-- ============================================================================
-- ADV-002: Registration fields for the advertiser onboarding (CRIT-VSC-003)
-- ============================================================================
-- Adds CNPJ + legal name (razão social) to businesses so the W2 step can
-- persist the advertiser draft and enforce algorithmic/duplicate checks.
-- ============================================================================

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- CNPJ must be stored normalized (14 digits only).
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS chk_businesses_cnpj_digits;
ALTER TABLE public.businesses ADD CONSTRAINT chk_businesses_cnpj_digits
  CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');

-- Duplicity verification: one active CNPJ per tenant (CRIT-VSC-003).
CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_cnpj_tenant
  ON public.businesses (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_cnpj ON public.businesses (cnpj);
