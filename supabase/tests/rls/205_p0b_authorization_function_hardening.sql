-- P0-B — testes locais das funções de autorização endurecidas.
-- Executar somente após aplicar o draft em um PostgreSQL/Supabase descartável.
-- Nunca executar contra produção. Todas as fixtures são revertidas ao final.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.plan(10);

INSERT INTO public.tenants (id, name, slug)
VALUES
  ('00000000-0000-0000-0000-000000205001', 'P0B Tenant A', 'p0b-tenant-a'),
  ('00000000-0000-0000-0000-000000205002', 'P0B Tenant B', 'p0b-tenant-b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000205101', 'p0b-master@example.test', '{}'),
  ('00000000-0000-0000-0000-000000205102', 'p0b-expired@example.test', '{}'),
  ('00000000-0000-0000-0000-000000205103', 'p0b-admin@example.test', '{}'),
  ('00000000-0000-0000-0000-000000205104', 'p0b-deleted@example.test', '{}')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET role = 'master', status = 'active', deleted_at = NULL
WHERE id = '00000000-0000-0000-0000-000000205101';
UPDATE public.profiles SET role = 'member', status = 'active', deleted_at = NULL,
  tenant_id = '00000000-0000-0000-0000-000000205001'
WHERE id = '00000000-0000-0000-0000-000000205102';
UPDATE public.profiles SET role = 'member', status = 'active', deleted_at = NULL,
  tenant_id = '00000000-0000-0000-0000-000000205001'
WHERE id = '00000000-0000-0000-0000-000000205103';
UPDATE public.profiles SET role = 'master', status = 'deleted', deleted_at = statement_timestamp()
WHERE id = '00000000-0000-0000-0000-000000205104';

INSERT INTO public.roles (id, tenant_id, code, name, is_global, role_type)
VALUES
  ('00000000-0000-0000-0000-000000205201', NULL, 'master', 'P0B Master', true, 'platform'),
  ('00000000-0000-0000-0000-000000205202', '00000000-0000-0000-0000-000000205001', 'tenant_admin', 'P0B Tenant Admin', false, 'tenant')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (tenant_id, user_id, role_id, status, expires_at)
VALUES
  ('00000000-0000-0000-0000-000000205001', '00000000-0000-0000-0000-000000205102', '00000000-0000-0000-0000-000000205201', 'active', statement_timestamp() - interval '1 minute')
ON CONFLICT (tenant_id, user_id, role_id) DO UPDATE
SET status = EXCLUDED.status, expires_at = EXCLUDED.expires_at;

INSERT INTO public.tenant_members (tenant_id, user_id, role, approved_at)
VALUES ('00000000-0000-0000-0000-000000205001', '00000000-0000-0000-0000-000000205103', 'admin', NULL)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role, approved_at = EXCLUDED.approved_at;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205101","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205101', true);
SELECT extensions.ok(public.has_global_platform_role('master'), 'master ativo conserva autoridade global');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205104","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205104', true);
SELECT extensions.is(public.has_global_platform_role('master'), false, 'perfil deleted nao conserva autoridade');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205102","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205102', true);
SELECT extensions.is(public.has_global_platform_role('master'), false, 'user_role expirado nao concede autoridade');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205103","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205103', true);
SELECT extensions.is(public.has_tenant_admin_access('00000000-0000-0000-0000-000000205001'), false, 'membership sem approved_at nao concede admin');

UPDATE public.tenant_members
SET approved_at = statement_timestamp()
WHERE tenant_id = '00000000-0000-0000-0000-000000205001'
  AND user_id = '00000000-0000-0000-0000-000000205103';
SELECT extensions.ok(public.has_tenant_admin_access('00000000-0000-0000-0000-000000205001'), 'membership aprovado concede admin do tenant correto');
SELECT extensions.is(public.has_tenant_admin_access('00000000-0000-0000-0000-000000205002'), false, 'admin nao cruza tenant adversarial');

SELECT extensions.is(
  (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = 'public.has_tenant_admin_access(uuid)'::regprocedure),
  true,
  'funcao tenant admin usa search_path vazio'
);
SELECT extensions.is(
  (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = 'public.protect_own_profile_authority_fields()'::regprocedure),
  true,
  'trigger de profiles usa search_path vazio'
);

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205103","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205103', true);
SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET role = 'master' WHERE id = '00000000-0000-0000-0000-000000205103'$$,
  '42501', NULL,
  'membro nao altera o proprio role'
);
SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET status = 'deleted' WHERE id = '00000000-0000-0000-0000-000000205103'$$,
  '42501', NULL,
  'membro nao altera o proprio status'
);

SELECT extensions.finish();

/*
SELECT * FROM (
  SELECT 'master_global' AS scenario,
    public.has_global_platform_role('master')::text AS observed
  FROM (SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205101","role":"authenticated"}', false)) AS s
  UNION ALL
  SELECT 'deleted_global', public.has_global_platform_role('master')::text
  FROM (SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205104","role":"authenticated"}', false)) AS s
  UNION ALL
  SELECT 'expired_global', public.has_global_platform_role('master')::text
  FROM (SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205102","role":"authenticated"}', false)) AS s
  UNION ALL
  SELECT 'tenant_admin', public.has_tenant_admin_access('00000000-0000-0000-0000-000000205001')::text
  FROM (SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205103","role":"authenticated"}', false)) AS s
  UNION ALL
  SELECT 'search_path_tenant_admin',
    (SELECT (proconfig @> ARRAY['search_path=""'])::text FROM pg_proc WHERE oid = 'public.has_tenant_admin_access(uuid)'::regprocedure)
  UNION ALL
  SELECT 'search_path_trigger',
    (SELECT (proconfig @> ARRAY['search_path=""'])::text FROM pg_proc WHERE oid = 'public.protect_own_profile_authority_fields()'::regprocedure)
  UNION ALL
  SELECT 'master_profile_role',
    (SELECT p.role FROM public.profiles AS p WHERE p.id = '00000000-0000-0000-0000-000000205101')
) AS diagnostic;

DO $$
DECLARE
  master_result boolean;
  deleted_result boolean;
  expired_result boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205101","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205101', true);
  master_result := public.has_global_platform_role('master');

  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205104","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205104', true);
  deleted_result := public.has_global_platform_role('master');

  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205102","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205102', true);
  expired_result := public.has_global_platform_role('master');

  RAISE NOTICE 'P0B_DEBUG master=%, deleted=%, expired=%', master_result, deleted_result, expired_result;
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000205101","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000205101', true);
SELECT auth.uid() AS master_uid, public.has_global_platform_role('master') AS master_result;

-- Diagnóstico visível no SQL Editor quando ele resume a saída do pgTAP.
*/
ROLLBACK;
