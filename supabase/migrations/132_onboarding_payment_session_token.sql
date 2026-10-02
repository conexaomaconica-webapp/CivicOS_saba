-- Migration 132: Sessão de Pagamento e Isolamento de Tokens (Microetapa 6.2)
-- CivicOS SABA / Conexão Maçônica

-- 1. Expande business_onboarding_tokens para diferenciar o tipo de token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_onboarding_tokens' AND column_name = 'token_type'
  ) THEN
    ALTER TABLE public.business_onboarding_tokens 
      ADD COLUMN token_type VARCHAR(30) NOT NULL DEFAULT 'contract_signature';
  END IF;
END $$;

-- 2. Índice de alta performance por negócio e tipo de sessão
CREATE INDEX IF NOT EXISTS idx_business_onboarding_tokens_biz_type 
  ON public.business_onboarding_tokens(business_id, token_type);
