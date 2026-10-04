-- Normaliza colunas probatórias que podem ter sido criadas anteriormente
-- com limites incompatíveis com assinatura PNG em data URL e User-Agent.
-- Idempotente: repetir ALTER TYPE TEXT não altera os dados existentes.

ALTER TABLE IF EXISTS public.contract_snapshots
  ALTER COLUMN signature_image_data TYPE TEXT
    USING signature_image_data::TEXT,
  ALTER COLUMN ip_address TYPE TEXT
    USING ip_address::TEXT,
  ALTER COLUMN user_agent TYPE TEXT
    USING user_agent::TEXT;

ALTER TABLE IF EXISTS public.contract_acceptances
  ALTER COLUMN ip_address TYPE TEXT
    USING ip_address::TEXT,
  ALTER COLUMN user_agent TYPE TEXT
    USING user_agent::TEXT;
