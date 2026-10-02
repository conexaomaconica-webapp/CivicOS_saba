-- Migration 137: Adiciona data de início do contrato em business_commercial_terms
-- CivicOS SABA / Conexão Maçônica
-- O administrador pode informar manualmente a data de início da vigência do contrato.
-- Quando nulo, a vigência conta a partir da data de assinatura (comportamento padrão).

ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS contract_start_date DATE;

COMMENT ON COLUMN public.business_commercial_terms.contract_start_date
  IS 'Data de início da vigência contratual definida pelo administrador. Quando NULL, a vigência conta a partir da data de assinatura do contrato.';
