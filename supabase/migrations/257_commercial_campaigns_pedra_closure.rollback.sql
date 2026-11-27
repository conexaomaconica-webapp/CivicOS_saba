-- ============================================================================
-- Rollback da Migration 255: Remove estrutura de commercial_campaigns (Gate 1B)
-- ============================================================================
-- Preserva integralmente business_commercial_terms, contracts, invoices e business_recognitions.
-- ============================================================================

DROP FUNCTION IF EXISTS public.consume_commercial_campaign_slot(UUID, TEXT, UUID, TEXT, TEXT, UUID);

ALTER TABLE public.business_commercial_terms
  DROP COLUMN IF EXISTS campaign_exception_id,
  DROP COLUMN IF EXISTS contract_duration_months,
  DROP COLUMN IF EXISTS campaign_code,
  DROP COLUMN IF EXISTS campaign_id;

DROP TABLE IF EXISTS public.commercial_campaign_exceptions;
DROP TABLE IF EXISTS public.commercial_campaigns;

NOTIFY pgrst, 'reload schema';

