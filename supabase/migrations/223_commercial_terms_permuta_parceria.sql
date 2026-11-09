-- Migration 223: Commercial Terms Permuta e Parceria (CivicOS SABA / Conexão Maçônica)
-- Permite modalidades comerciais de Permuta 100%, Permuta 50% e Parceria Institucional / Cortesia
-- sem cobrança indevida ou pendência financeira para apoiadores e fornecedores do evento de lançamento.

-- 1. Flexibilizar constraint de forma de pagamento
ALTER TABLE public.business_commercial_terms
  DROP CONSTRAINT IF EXISTS business_commercial_terms_payment_method_check;

ALTER TABLE public.business_commercial_terms
  ADD CONSTRAINT business_commercial_terms_payment_method_check
  CHECK (payment_method IN ('avista', 'parcelado', 'permuta_100', 'permuta_50', 'parceria'));

-- 2. Permitir amount_cents = 0 para Permuta 100% e Parcerias sem custo financeiro
ALTER TABLE public.business_commercial_terms
  DROP CONSTRAINT IF EXISTS business_commercial_terms_amount_cents_check;

ALTER TABLE public.business_commercial_terms
  ADD CONSTRAINT business_commercial_terms_amount_cents_check
  CHECK (amount_cents >= 0);

-- 3. Adicionar campos de modalidade e descrição da permuta / cortesia
ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS commercial_modality VARCHAR(30) DEFAULT 'padrao'
  CHECK (commercial_modality IN ('padrao', 'permuta_100', 'permuta_50', 'parceria'));

ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS permuta_description TEXT;

