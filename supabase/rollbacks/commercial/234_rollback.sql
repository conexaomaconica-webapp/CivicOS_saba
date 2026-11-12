-- ROLLBACK da migration 234 (funções de autorização). Fora de supabase/migrations de propósito.
-- Execute depois dos rollbacks 236 e 235 (as políticas dependem destas funções).
-- Reaplica a regra "operação exige captura ligada" SOMENTE se nenhum tenant violar; caso contrário recusa.

DO $$
DECLARE
  n BIGINT;
BEGIN
  IF to_regclass('public.commercial_settings') IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.commercial_settings WHERE module_enabled AND capture_mode = 'off';
    IF n > 0 THEN
      RAISE EXCEPTION 'Rollback 234 recusado: % tenant(s) com módulo habilitado e captura desligada. Desabilite o módulo antes.', n;
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.commercial_payout_rep_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_lead_rep_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_rep_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.has_commercial_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS public.commercial_profile_is_active();
DROP FUNCTION IF EXISTS public.commercial_module_enabled(UUID);
DROP FUNCTION IF EXISTS public.commercial_try_uuid(TEXT);

ALTER TABLE public.commercial_settings
  DROP CONSTRAINT IF EXISTS commercial_settings_module_requires_capture;
ALTER TABLE public.commercial_settings
  ADD CONSTRAINT commercial_settings_module_requires_capture
  CHECK (NOT module_enabled OR capture_mode <> 'off');

NOTIFY pgrst, 'reload schema';
