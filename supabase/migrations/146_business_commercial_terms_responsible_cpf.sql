-- CPF do responsável legal congelado junto aos termos da contratação.
ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS responsible_cpf VARCHAR(11);

ALTER TABLE public.business_commercial_terms
  DROP CONSTRAINT IF EXISTS business_commercial_terms_responsible_cpf_check;

ALTER TABLE public.business_commercial_terms
  ADD CONSTRAINT business_commercial_terms_responsible_cpf_check
  CHECK (responsible_cpf IS NULL OR responsible_cpf ~ '^[0-9]{11}$');

COMMENT ON COLUMN public.business_commercial_terms.responsible_cpf IS
  'CPF do responsável legal, restrito ao prontuário comercial e usado na minuta contratual.';
