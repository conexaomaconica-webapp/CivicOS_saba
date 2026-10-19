-- P0 pre-production catalog audit.
-- READ-ONLY: review before execution. Do not run against production without
-- explicit authorization. This script returns metadata only, never table rows
-- or domain values.

BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '1s';

-- 1. Discover migration-history relations without referencing an absent table.
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema IN ('supabase_migrations', 'auth', 'realtime', 'storage')
  AND (table_name ILIKE '%migration%'
    OR table_name ILIKE '%schema%'
    OR table_name ILIKE '%history%')
ORDER BY table_schema, table_name, ordinal_position;

SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       c.relkind,
       pg_get_userbyid(c.relowner) AS owner_name
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname IN ('supabase_migrations', 'auth', 'realtime', 'storage')
  AND (c.relname ILIKE '%migration%'
    OR c.relname ILIKE '%schema%'
    OR c.relname ILIKE '%history%')
ORDER BY schema_name, relation_name;

-- 2. Relevant relations, RLS state and effective SELECT privileges.
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       c.relkind,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls,
       pg_get_userbyid(c.relowner) AS owner_name,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles', 'user_profiles', 'tenants', 'tenant_domains',
    'tenant_members', 'business_members', 'user_roles', 'roles',
    'businesses', 'subscriptions', 'plans', 'plan_versions',
    'plan_entitlements', 'event_registrations'
  )
ORDER BY relation_name;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'user_profiles', 'tenants', 'tenant_domains',
    'tenant_members', 'business_members', 'user_roles', 'roles',
    'businesses', 'subscriptions', 'plans', 'plan_versions',
    'plan_entitlements', 'event_registrations'
  )
ORDER BY table_name, ordinal_position;

-- 3. RLS policies and table grants.
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_profiles', 'tenants', 'tenant_domains',
    'tenant_members', 'business_members', 'user_roles', 'roles',
    'businesses', 'subscriptions', 'plans', 'plan_versions',
    'plan_entitlements', 'event_registrations'
  )
ORDER BY tablename, policyname;

SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'user_profiles', 'tenants', 'tenant_domains',
    'tenant_members', 'business_members', 'user_roles', 'roles',
    'businesses', 'subscriptions', 'plans', 'plan_versions',
    'plan_entitlements', 'event_registrations'
  )
ORDER BY table_name, grantee, privilege_type;

SELECT c.oid::regclass AS relation,
       r.rolname AS role_name,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN pg_catalog.pg_roles AS r
WHERE n.nspname = 'public'
  AND r.rolname IN ('anon', 'authenticated')
  AND c.relname IN (
    'profiles', 'user_profiles', 'tenants', 'tenant_domains',
    'tenant_members', 'business_members', 'user_roles', 'roles',
    'businesses', 'subscriptions', 'plans', 'plan_versions',
    'plan_entitlements', 'event_registrations'
  )
ORDER BY relation, role_name;

-- 4. Function attributes and effective EXECUTE privileges.
SELECT p.oid::regprocedure AS function_signature,
       pg_get_userbyid(p.proowner) AS owner_name,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility,
       p.proconfig AS configuration,
       pg_catalog.array_to_string(p.proacl, E'\n') AS acl,
       pg_catalog.pg_get_function_result(p.oid) AS return_type
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    '_resolve_public_tenant_id', '_effective_business_plan',
    'public_business_detail', 'has_global_platform_role',
    'has_tenant_admin_access', 'get_current_user_role',
    'protect_own_profile_authority_fields',
    '_trg_enforce_business_service_quota',
    '_trg_enforce_business_benefit_quota',
    'upsert_event_registration'
  )
ORDER BY function_signature;

SELECT p.oid::regprocedure AS function_signature,
       r.rolname AS role_name,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN pg_catalog.pg_roles AS r
WHERE n.nspname = 'public'
  AND r.rolname IN ('anon', 'authenticated')
  AND p.proname IN (
    '_resolve_public_tenant_id', '_effective_business_plan',
    'public_business_detail', 'has_global_platform_role',
    'has_tenant_admin_access', 'get_current_user_role',
    'protect_own_profile_authority_fields',
    '_trg_enforce_business_service_quota',
    '_trg_enforce_business_benefit_quota',
    'upsert_event_registration'
  )
ORDER BY function_signature, role_name;

-- 5. Domain compatibility is metadata-only; no tenant_domains rows are read.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tenant_domains', 'tenants')
ORDER BY table_name, ordinal_position;

-- 6. Relation and view dependencies on profiles.
SELECT dependent_ns.nspname AS dependent_schema,
       dependent.relname AS dependent_object,
       dependent.relkind AS dependent_kind,
       source_ns.nspname AS source_schema,
       source.relname AS source_object
FROM pg_catalog.pg_depend AS d
JOIN pg_catalog.pg_class AS dependent ON dependent.oid = d.objid
JOIN pg_catalog.pg_namespace AS dependent_ns ON dependent_ns.oid = dependent.relnamespace
JOIN pg_catalog.pg_class AS source ON source.oid = d.refobjid
JOIN pg_catalog.pg_namespace AS source_ns ON source_ns.oid = source.relnamespace
WHERE source_ns.nspname = 'public'
  AND source.relname = 'profiles'
ORDER BY dependent_schema, dependent_object;

SELECT DISTINCT view_ns.nspname AS view_schema,
       view_rel.relname AS view_name,
       source_ns.nspname AS source_schema,
       source_rel.relname AS source_relation
FROM pg_catalog.pg_depend AS d
JOIN pg_catalog.pg_rewrite AS rw ON rw.oid = d.objid
JOIN pg_catalog.pg_class AS view_rel ON view_rel.oid = rw.ev_class
JOIN pg_catalog.pg_namespace AS view_ns ON view_ns.oid = view_rel.relnamespace
JOIN pg_catalog.pg_class AS source_rel ON source_rel.oid = d.refobjid
JOIN pg_catalog.pg_namespace AS source_ns ON source_ns.oid = source_rel.relnamespace
WHERE view_rel.relkind = 'v'
  AND source_ns.nspname = 'public'
  AND source_rel.relname = 'profiles'
ORDER BY view_schema, view_name;

-- 7. Trigger metadata for profile, business and RSVP flows.
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       t.tgname AS trigger_name,
       t.tgenabled AS enabled_mode,
       pg_catalog.pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_catalog.pg_trigger AS t
JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'businesses', 'event_registrations')
  AND NOT t.tgisinternal
ORDER BY relation_name, trigger_name;

ROLLBACK;
