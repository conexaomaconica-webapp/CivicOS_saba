-- P0-B — Catálogo de segurança Supabase (somente leitura)
-- Projeto-alvo: rwvztwsjcjljphqttiws
--
-- Execute no SQL Editor do projeto de produção, após revisão.
-- Este arquivo contém somente SELECT. Não execute junto com migrations.
-- Não inclui pg_get_functiondef/prosrc para evitar exportar código sensível.

SELECT '01_relations_rls' AS section;
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    ELSE c.relkind::text
  END AS relation_kind,
  pg_get_userbyid(c.relowner) AS owner_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  c.reloptions AS relation_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage', 'auth')
  AND c.relkind IN ('r', 'p', 'v', 'm')
ORDER BY n.nspname, c.relname;

SELECT '02_policies' AS section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage', 'auth')
ORDER BY schemaname, tablename, policyname;

SELECT '03_table_grants' AS section;
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'storage', 'auth')
ORDER BY table_schema, table_name, grantee, privilege_type;

SELECT '04_views_metadata' AS section;
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname IN ('public', 'storage', 'auth')
ORDER BY schemaname, viewname;

SELECT '05_functions_metadata' AS section;
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  p.proleakproof AS leakproof,
  p.proconfig AS configuration,
  p.proacl AS access_control_list
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'storage', 'auth')
ORDER BY n.nspname, p.proname, identity_arguments;

SELECT '06_function_grants' AS section;
SELECT
  routine_schema,
  routine_name,
  specific_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema IN ('public', 'storage', 'auth')
ORDER BY routine_schema, routine_name, specific_name, grantee, privilege_type;

SELECT '07_roles_and_memberships' AS section;
SELECT
  r.rolname AS role_name,
  r.rolsuper AS is_superuser,
  r.rolinherit AS inherits,
  r.rolcreaterole AS can_create_role,
  r.rolcreatedb AS can_create_db,
  r.rolcanlogin AS can_login,
  r.rolbypassrls AS bypasses_rls
FROM pg_roles r
WHERE r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
   OR r.rolname LIKE 'supabase_%'
ORDER BY r.rolname;

SELECT '08_role_memberships' AS section;
SELECT
  member.rolname AS member_role,
  granted.rolname AS granted_role,
  am.admin_option
FROM pg_auth_members am
JOIN pg_roles member ON member.oid = am.member
JOIN pg_roles granted ON granted.oid = am.roleid
WHERE member.rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
   OR granted.rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin')
ORDER BY member.rolname, granted.rolname;

SELECT '09_storage_policies' AS section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

SELECT '10_migration_history_metadata' AS section;
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations';

-- Limitações intencionais:
-- * Não consulta tabelas de negócio, usuários, e-mails, tokens ou conteúdo.
-- * Não retorna corpos de funções (prosrc/pg_get_functiondef).
-- * Configuração Auth, hooks JWT e allowlist de redirects devem ser exportados
--   separadamente pela interface de configuração, sem segredos.
