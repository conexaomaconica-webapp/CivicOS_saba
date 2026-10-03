-- Restaura os papéis operacionais usados pelo gerenciador /admin/settings.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'master', 'superadmin', 'platform_admin', 'admin', 'socio_admin',
    'finance', 'moderator', 'editor', 'anunciante', 'advertiser', 'member'
  ));

-- Corrige contas administrativas criadas enquanto a constraint aceitava apenas member.
UPDATE public.profiles AS p
SET
  role = LOWER(u.raw_user_meta_data ->> 'role'),
  updated_at = NOW()
FROM auth.users AS u
WHERE p.id = u.id
  AND p.role = 'member'
  AND jsonb_typeof(u.raw_user_meta_data -> 'allowed_modules') = 'array'
  AND LOWER(COALESCE(u.raw_user_meta_data ->> 'role', '')) IN (
    'master', 'superadmin', 'platform_admin', 'admin', 'socio_admin',
    'finance', 'moderator', 'editor'
  );
