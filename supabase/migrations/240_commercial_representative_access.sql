-- 240 - Módulo Comercial Nacional · Gate 1C.2 · Cadastro direto de representante (senha temporária)
--
-- ADITIVA: três colunas em commercial_representatives. A senha temporária NUNCA é guardada aqui (nem em
-- nenhuma tabela): só o modo de acesso, a validade e a data da troca. O sinal que força a troca no primeiro
-- login vive em auth.users.app_metadata (só o servidor altera) e é espelhado nestas colunas para a equipe ver.
-- Escrita: somente service_role (a 235 só concede SELECT por coluna a authenticated).
-- Reversão: supabase/rollbacks/commercial/240_rollback.sql

ALTER TABLE public.commercial_representatives
  ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'invite',
  ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_representatives_access_mode_check') THEN
    ALTER TABLE public.commercial_representatives
      ADD CONSTRAINT commercial_representatives_access_mode_check CHECK (access_mode IN ('invite', 'temp_password'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_representatives_temp_expiry_check') THEN
    ALTER TABLE public.commercial_representatives
      ADD CONSTRAINT commercial_representatives_temp_expiry_check
      CHECK (temp_password_expires_at IS NULL OR access_mode = 'temp_password');
  END IF;
END $$;

-- O representante e a equipe leem o estado (a RLS da 235 continua decidindo QUAIS linhas).
GRANT SELECT (access_mode, temp_password_expires_at, password_changed_at)
  ON public.commercial_representatives TO authenticated;
