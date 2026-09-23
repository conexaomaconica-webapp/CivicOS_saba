-- MEMBER-001: fundacao da Area do Membro.
-- Supabase Auth permanece como identidade canonica; profiles armazena apenas
-- dados operacionais e preferencias do proprio usuario.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';
UPDATE public.profiles SET role = 'member' WHERE role = 'usuario_comum';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'socio_admin', 'anunciante', 'member', 'usuario_comum'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_state_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_state_check
  CHECK (state IS NULL OR state ~ '^[A-Z]{2}$');

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()), 'member');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_tenant_id UUID;
  target_name TEXT;
  target_city TEXT;
  target_state TEXT;
  accepted_terms TIMESTAMPTZ;
  accepted_privacy TIMESTAMPTZ;
BEGIN
  target_name := left(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', '')), 180);
  target_city := NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'city', '')), 120), '');
  target_state := upper(NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'state', '')), 2), ''));
  IF target_state IS NOT NULL AND target_state !~ '^[A-Z]{2}$' THEN target_state := NULL; END IF;

  BEGIN target_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  EXCEPTION WHEN OTHERS THEN target_tenant_id := NULL;
  END;
  BEGIN accepted_terms := (NEW.raw_user_meta_data ->> 'terms_accepted_at')::TIMESTAMPTZ;
  EXCEPTION WHEN OTHERS THEN accepted_terms := NULL;
  END;
  BEGIN accepted_privacy := (NEW.raw_user_meta_data ->> 'privacy_accepted_at')::TIMESTAMPTZ;
  EXCEPTION WHEN OTHERS THEN accepted_privacy := NULL;
  END;

  INSERT INTO public.profiles (
    id, name, email, role, tenant_id, city, state,
    terms_accepted_at, privacy_accepted_at
  ) VALUES (
    NEW.id, target_name, NEW.email, 'member', target_tenant_id, target_city,
    target_state, accepted_terms, accepted_privacy
  ) ON CONFLICT (id) DO NOTHING;

  IF target_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, NEW.id, 'member')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('member-avatars', 'member-avatars', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS member_avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS member_avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS member_avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS member_avatars_owner_delete ON storage.objects;

CREATE POLICY member_avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'member-avatars');
CREATE POLICY member_avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY member_avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'member-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'member-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY member_avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'member-avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
