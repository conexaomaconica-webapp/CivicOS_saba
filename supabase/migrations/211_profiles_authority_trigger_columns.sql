-- 211 - Inclui status, exclusao e consentimentos no trigger de autoridade.
-- Somente local/homologacao nesta etapa.

DROP TRIGGER IF EXISTS trg_profiles_protect_own_authority_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_own_authority_fields
  BEFORE UPDATE OF id, role, tenant_id, status, deleted_at,
    terms_accepted_at, privacy_accepted_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_own_profile_authority_fields();
