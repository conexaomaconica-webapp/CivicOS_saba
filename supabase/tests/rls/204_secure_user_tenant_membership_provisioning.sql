-- P1-B: execute somente no banco local descartável após aplicar migrations.
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.plan(13);

INSERT INTO public.tenants (id, name, slug)
VALUES
  ('00000000-0000-0000-0000-000000204001', 'Tenant P1 A', 'tenant-p1-a'),
  ('00000000-0000-0000-0000-000000204002', 'Tenant P1 B', 'tenant-p1-b');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '00000000-0000-0000-0000-000000204101',
    'attacker-p1@example.test',
    jsonb_build_object(
      'name', 'Cadastro Público',
      'role', 'owner',
      'tenant_id', '00000000-0000-0000-0000-000000204001',
      'terms_accepted_at', '2000-01-01T00:00:00Z',
      'privacy_accepted_at', '2000-01-01T00:00:00Z'
    )
  ),
  (
    '00000000-0000-0000-0000-000000204102',
    'admin-p1@example.test',
    jsonb_build_object('name', 'Administrador P1')
  );

SELECT extensions.is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  'member',
  'cadastro público ignora role de user_metadata'
);
SELECT extensions.is(
  (SELECT tenant_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  NULL::UUID,
  'cadastro público ignora tenant_id de user_metadata'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.tenant_members WHERE user_id = '00000000-0000-0000-0000-000000204101'),
  0::BIGINT,
  'cadastro público não cria membership'
);
SELECT extensions.ok(
  (SELECT terms_accepted_at > '2020-01-01'::TIMESTAMPTZ FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  'instante de aceite é registrado pelo servidor'
);
SELECT extensions.ok(
  (SELECT privacy_accepted_at > '2020-01-01'::TIMESTAMPTZ FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  'instante de privacidade é registrado pelo servidor'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000204101","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT extensions.throws_ok(
  $$SELECT public.provision_authorized_tenant_membership(
    '00000000-0000-0000-0000-000000204101',
    '00000000-0000-0000-0000-000000204001',
    'member', 'member', 'admin_user_creation',
    '00000000-0000-0000-0000-000000204102'
  )$$,
  '42501',
  NULL,
  'authenticated não pode provisionar membership'
);
RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000204102","role":"service_role"}',
  true
);
SET LOCAL ROLE service_role;
SELECT extensions.lives_ok(
  $$SELECT public.provision_authorized_tenant_membership(
    '00000000-0000-0000-0000-000000204101',
    '00000000-0000-0000-0000-000000204001',
    'anunciante', 'member', 'admin_advertiser_creation',
    '00000000-0000-0000-0000-000000204102'
  )$$,
  'service_role provisiona vínculo autorizado'
);
RESET ROLE;

SELECT extensions.is(
  (SELECT tenant_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  '00000000-0000-0000-0000-000000204001'::UUID,
  'provisionamento atualiza tenant do perfil'
);
SELECT extensions.is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000204101'),
  'anunciante',
  'provisionamento atualiza papel do perfil'
);
SELECT extensions.is(
  (SELECT role FROM public.tenant_members WHERE user_id = '00000000-0000-0000-0000-000000204101'),
  'member',
  'provisionamento cria membership sem elevação indevida'
);
SELECT extensions.is(
  (SELECT membership_source FROM public.tenant_members WHERE user_id = '00000000-0000-0000-0000-000000204101'),
  'admin_advertiser_creation',
  'membership registra proveniência'
);
SELECT extensions.is(
  (SELECT created_by FROM public.tenant_members WHERE user_id = '00000000-0000-0000-0000-000000204101'),
  '00000000-0000-0000-0000-000000204102'::UUID,
  'membership registra ator administrativo'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000204102","role":"service_role"}',
  true
);
SET LOCAL ROLE service_role;
SELECT extensions.throws_ok(
  $$SELECT public.provision_authorized_tenant_membership(
    '00000000-0000-0000-0000-000000204101',
    '00000000-0000-0000-0000-000000204002',
    'anunciante', 'member', 'admin_advertiser_creation',
    '00000000-0000-0000-0000-000000204102'
  )$$,
  '23514',
  NULL,
  'provisionamento rejeita troca silenciosa de tenant'
);
RESET ROLE;

SELECT * FROM extensions.finish();
ROLLBACK;
