-- P1-B: remove autoridade de raw_user_meta_data e centraliza o provisionamento
-- legítimo de memberships em uma operação atômica exclusiva do servidor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_name TEXT;
  target_city TEXT;
  target_state TEXT;
  accepted_terms TIMESTAMPTZ;
  accepted_privacy TIMESTAMPTZ;
BEGIN
  target_name := left(trim(COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    ''
  )), 180);
  target_city := NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'city', '')), 120), '');
  target_state := upper(NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'state', '')), 2), ''));
  IF target_state IS NOT NULL AND target_state !~ '^[A-Z]{2}$' THEN
    target_state := NULL;
  END IF;

  -- O cliente declara o aceite, mas não determina o instante registrado. Estes
  -- campos não substituem uma evidência versionada de consentimento no servidor.
  accepted_terms := CASE
    WHEN NULLIF(NEW.raw_user_meta_data ->> 'terms_accepted_at', '') IS NOT NULL THEN statement_timestamp()
    ELSE NULL
  END;
  accepted_privacy := CASE
    WHEN NULLIF(NEW.raw_user_meta_data ->> 'privacy_accepted_at', '') IS NOT NULL THEN statement_timestamp()
    ELSE NULL
  END;

  INSERT INTO public.profiles (
    id, name, email, role, tenant_id, city, state,
    terms_accepted_at, privacy_accepted_at
  ) VALUES (
    NEW.id, target_name, NEW.email, 'member', NULL, target_city, target_state,
    accepted_terms, accepted_privacy
  );

  -- tenant_id, role e demais atributos de autorização enviados pelo cliente
  -- são deliberadamente ignorados. O cadastro público não cria membership.
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS membership_source TEXT NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_membership_source_check;
ALTER TABLE public.tenant_members
  ADD CONSTRAINT tenant_members_membership_source_check
  CHECK (membership_source IN (
    'legacy_unknown',
    'admin_user_creation',
    'admin_advertiser_creation',
    'signup_invite_conversion'
  ));

CREATE OR REPLACE FUNCTION public.provision_authorized_tenant_membership(
  p_user_id UUID,
  p_tenant_id UUID,
  p_profile_role TEXT,
  p_membership_role TEXT,
  p_source TEXT,
  p_created_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_profile_tenant UUID;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Provisionamento de membership restrito ao servidor'
      USING ERRCODE = '42501';
  END IF;

  IF p_profile_role NOT IN (
    'master', 'superadmin', 'platform_admin', 'admin', 'socio_admin',
    'finance', 'moderator', 'editor', 'anunciante', 'advertiser', 'member'
  ) THEN
    RAISE EXCEPTION 'Papel de perfil inválido' USING ERRCODE = '22023';
  END IF;
  IF p_membership_role NOT IN ('member', 'admin', 'tenant_admin', 'owner', 'socio_admin') THEN
    RAISE EXCEPTION 'Papel de membership inválido' USING ERRCODE = '22023';
  END IF;
  IF p_source NOT IN (
    'admin_user_creation',
    'admin_advertiser_creation',
    'signup_invite_conversion'
  ) THEN
    RAISE EXCEPTION 'Origem de membership inválida' USING ERRCODE = '22023';
  END IF;
  IF p_created_by IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_created_by
  ) THEN
    RAISE EXCEPTION 'Ator administrativo inválido' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant inválido' USING ERRCODE = '23503';
  END IF;

  SELECT p.tenant_id
    INTO existing_profile_tenant
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado' USING ERRCODE = '23503';
  END IF;
  IF existing_profile_tenant IS NOT NULL AND existing_profile_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Perfil já associado a outro tenant' USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
  SET tenant_id = p_tenant_id,
      role = p_profile_role,
      updated_at = statement_timestamp()
  WHERE id = p_user_id;

  INSERT INTO public.tenant_members (
    tenant_id, user_id, role, membership_source, created_by, approved_at
  ) VALUES (
    p_tenant_id, p_user_id, p_membership_role, p_source, p_created_by, statement_timestamp()
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      membership_source = EXCLUDED.membership_source,
      created_by = EXCLUDED.created_by,
      approved_at = EXCLUDED.approved_at;
END;
$$;

ALTER FUNCTION public.provision_authorized_tenant_membership(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.provision_authorized_tenant_membership(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_authorized_tenant_membership(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  TO service_role;

COMMENT ON FUNCTION public.provision_authorized_tenant_membership(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  IS 'P1-B: provisiona perfil e membership atomicamente; somente service_role após autorização da aplicação.';

NOTIFY pgrst, 'reload schema';
