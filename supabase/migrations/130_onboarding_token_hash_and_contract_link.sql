-- Migration 130: Hardening de Tokens de Onboarding (Token Hash + Vínculo com Contrato e Snapshot)
-- CivicOS SABA / Conexão Maçônica

-- 1. Expande business_onboarding_tokens para armazenar token_hash, contract_id e snapshot_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_onboarding_tokens' AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE public.business_onboarding_tokens ADD COLUMN token_hash VARCHAR(64);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_onboarding_tokens' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE public.business_onboarding_tokens ADD COLUMN contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_onboarding_tokens' AND column_name = 'snapshot_id'
  ) THEN
    ALTER TABLE public.business_onboarding_tokens ADD COLUMN snapshot_id UUID REFERENCES public.contract_snapshots(id) ON DELETE CASCADE;
  END IF;

  -- Permite que token em texto puro seja nulo (garantindo que tokens futuros nunca sejam salvos em plaintext)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_onboarding_tokens' AND column_name = 'token' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.business_onboarding_tokens ALTER COLUMN token DROP NOT NULL;
  END IF;

  -- Permite que user_id em contract_acceptances seja nulo em assinaturas públicas via token
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_acceptances' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contract_acceptances ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Popula token_hash para registros legados que eventualmente existam com SHA-256
UPDATE public.business_onboarding_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- 3. Índices de alta velocidade e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_onboarding_tokens_hash 
  ON public.business_onboarding_tokens(token_hash) 
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_onboarding_tokens_contract 
  ON public.business_onboarding_tokens(contract_id);

CREATE INDEX IF NOT EXISTS idx_business_onboarding_tokens_snapshot 
  ON public.business_onboarding_tokens(snapshot_id);
