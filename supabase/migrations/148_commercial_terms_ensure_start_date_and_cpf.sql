-- Migration 148: Garante colunas de vigência e CPF do responsável em business_commercial_terms
-- CivicOS SABA / Conexão Maçônica

ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS responsible_cpf varchar(11);

COMMENT ON COLUMN public.business_commercial_terms.contract_start_date
  IS 'Data acordada para início da vigência contratual. Quando nula, a vigência inicia na assinatura.';

COMMENT ON COLUMN public.business_commercial_terms.responsible_cpf
  IS 'CPF do responsável legal congelado na conferência comercial.';
