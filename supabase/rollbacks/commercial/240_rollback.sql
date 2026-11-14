-- ROLLBACK da migration 240 (cadastro direto de representante). Fora de supabase/migrations de propósito.
-- Recusa se houver representante cadastrado por senha temporária: apagar a coluna perderia o registro de como
-- o acesso foi concedido e da troca de senha.
DO $$
DECLARE
  n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM public.commercial_representatives
   WHERE access_mode = 'temp_password' OR password_changed_at IS NOT NULL OR temp_password_expires_at IS NOT NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Rollback 240 recusado: % representante(s) com acesso direto/senha temporária registrados.', n;
  END IF;
END $$;

ALTER TABLE public.commercial_representatives DROP CONSTRAINT IF EXISTS commercial_representatives_temp_expiry_check;
ALTER TABLE public.commercial_representatives DROP CONSTRAINT IF EXISTS commercial_representatives_access_mode_check;
ALTER TABLE public.commercial_representatives
  DROP COLUMN IF EXISTS temp_password_expires_at,
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS access_mode;
