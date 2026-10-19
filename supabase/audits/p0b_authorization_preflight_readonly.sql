-- P0-B — PRÉ-HOMOLOGAÇÃO READ-ONLY
--
-- Execute somente no SQL Editor após revisar o conteúdo.
-- Este script não altera tabelas, funções, grants, policies ou configurações.
-- Não retorna nomes, e-mails, UUIDs de usuários ou documentos pessoais.

-- 1. Compatibilidade de tenant_members: vínculos administrativos sem aprovação.
SELECT
  tm.role,
  count(*)::bigint AS total_memberships,
  count(*) FILTER (WHERE tm.approved_at IS NULL)::bigint AS without_approved_at,
  count(*) FILTER (WHERE tm.approved_at IS NOT NULL)::bigint AS approved
FROM public.tenant_members AS tm
WHERE tm.role IN ('admin', 'tenant_admin', 'owner', 'socio_admin')
GROUP BY tm.role
ORDER BY tm.role;

-- 2. Distribuição de status dos perfis sem expor identidade.
SELECT
  p.status,
  count(*)::bigint AS total_profiles,
  count(*) FILTER (WHERE p.deleted_at IS NOT NULL)::bigint AS deleted_at_present
FROM public.profiles AS p
GROUP BY p.status
ORDER BY p.status;

-- 3. Consentimentos: distingue primeira aceitação de alterações já registradas.
SELECT
  count(*) FILTER (WHERE terms_accepted_at IS NULL)::bigint AS terms_not_recorded,
  count(*) FILTER (WHERE terms_accepted_at IS NOT NULL)::bigint AS terms_recorded,
  count(*) FILTER (WHERE privacy_accepted_at IS NULL)::bigint AS privacy_not_recorded,
  count(*) FILTER (WHERE privacy_accepted_at IS NOT NULL)::bigint AS privacy_recorded
FROM public.profiles;

-- 4. User roles por status e expiração, sem identificar usuários.
SELECT
  ur.status,
  count(*)::bigint AS total_assignments,
  count(*) FILTER (WHERE ur.expires_at IS NULL)::bigint AS without_expiry,
  count(*) FILTER (WHERE ur.expires_at <= statement_timestamp())::bigint AS expired,
  count(*) FILTER (WHERE ur.expires_at > statement_timestamp())::bigint AS future_expiry
FROM public.user_roles AS ur
GROUP BY ur.status
ORDER BY ur.status;

-- 5. Coerência entre roles globais e tenant-scoped.
SELECT
  CASE
    WHEN r.is_global = true AND r.tenant_id IS NULL THEN 'global_without_tenant'
    WHEN r.is_global = true AND r.tenant_id IS NOT NULL THEN 'global_with_tenant'
    WHEN r.is_global = false AND r.tenant_id IS NULL THEN 'nonglobal_without_tenant'
    ELSE 'tenant_scoped'
  END AS role_scope,
  r.role_type,
  count(*)::bigint AS total_roles
FROM public.roles AS r
GROUP BY 1, r.role_type
ORDER BY 1, r.role_type;

-- 6. Funções críticas: owner, SECURITY DEFINER e search_path efetivo.
SELECT
  p.oid::regprocedure::text AS function_name,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  coalesce(array_to_string(p.proconfig, ';'), '') AS configuration
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.oid IN (
    'public.get_current_user_role()'::regprocedure,
    'public.has_global_platform_role(text)'::regprocedure,
    'public.has_tenant_admin_access(uuid)'::regprocedure,
    'public.protect_own_profile_authority_fields()'::regprocedure
  )
ORDER BY function_name;

-- 7. EXECUTE efetivo das funções críticas por PUBLIC/anon/authenticated.
SELECT
  p.oid::regprocedure::text AS function_name,
  r.rolname AS grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute,
  coalesce(array_to_string(p.proacl, ';'), '') AS acl_entries
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'::name), ('authenticated'::name)) AS r(rolname)
WHERE n.nspname = 'public'
  AND p.oid IN (
    'public.get_current_user_role()'::regprocedure,
    'public.has_global_platform_role(text)'::regprocedure,
    'public.has_tenant_admin_access(uuid)'::regprocedure,
    'public.protect_own_profile_authority_fields()'::regprocedure
  )
ORDER BY function_name, grantee;

-- 8. Trigger atual e colunas protegidas, sem consultar dados pessoais.
SELECT
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_trigger AS t
JOIN pg_class AS c ON c.oid = t.tgrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'profiles'
  AND NOT t.tgisinternal
  AND t.tgname = 'trg_profiles_protect_own_authority_fields';

-- 9. Grants da tabela profiles, somente metadados de privilégio.
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee IN ('public', 'anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;
