-- MEMBER-001: encerra a compatibilidade temporaria de role e reforca no banco
-- a imutabilidade dos campos de autoridade no autoatendimento do membro.

UPDATE public.profiles
SET role = 'member'
WHERE role = 'usuario_comum';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'socio_admin', 'anunciante', 'member'));

CREATE OR REPLACE FUNCTION public.protect_own_profile_authority_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() = OLD.id AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
  ) THEN
    RAISE EXCEPTION 'Campos de autoridade do perfil nao podem ser alterados no autoatendimento'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_own_profile_authority_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_protect_own_authority_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_own_authority_fields
  BEFORE UPDATE OF id, role, tenant_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_own_profile_authority_fields();
