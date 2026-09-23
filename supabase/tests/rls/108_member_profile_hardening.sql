-- MEMBER-001: execute somente no ambiente local de testes com pgTAP.
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.plan(4);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000108001',
  'member-108@example.test',
  jsonb_build_object('name', 'Membro Protegido', 'role', 'master')
);

SELECT extensions.is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000108001'),
  'member',
  'cadastro publico continua ignorando role enviada pelo cliente'
);

SELECT extensions.ok(
  NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'usuario_comum'),
  'role legado foi removido dos dados ativos'
);

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000108001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET role = 'master' WHERE id = auth.uid()$$,
  '42501',
  NULL,
  'trigger bloqueia autoelevacao de role'
);

SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000010' WHERE id = auth.uid()$$,
  '42501',
  NULL,
  'trigger bloqueia troca de tenant no autoatendimento'
);

RESET ROLE;
SELECT * FROM extensions.finish();
ROLLBACK;
