-- MEMBER-001: execute somente no ambiente local de testes com pgTAP.
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.plan(10);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000107001', 'member-107-a@example.test', jsonb_build_object(
    'name', 'Membro Teste', 'role', 'master', 'city', 'Feira de Santana',
    'state', 'ba', 'terms_accepted_at', now(), 'privacy_accepted_at', now()
  )),
  ('00000000-0000-0000-0000-000000107002', 'member-107-b@example.test', jsonb_build_object(
    'name', 'Outro Membro', 'role', 'anunciante', 'city', 'Salvador', 'state', 'BA'
  ));

SELECT extensions.is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000107001'),
  'member',
  'cadastro publico ignora tentativa de role master'
);
SELECT extensions.is(
  (SELECT role FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000107002'),
  'member',
  'cadastro publico ignora tentativa de role anunciante'
);
SELECT extensions.is(
  (SELECT state FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000107001'),
  'BA',
  'trigger normaliza UF'
);
SELECT extensions.ok(
  (SELECT terms_accepted_at IS NOT NULL AND privacy_accepted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000107001'),
  'trigger persiste aceites legais'
);

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000107001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.profiles WHERE id = auth.uid()),
  1::BIGINT,
  'membro le o proprio perfil'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000107002'),
  0::BIGINT,
  'membro nao le perfil de terceiro'
);
SELECT extensions.lives_ok(
  $$UPDATE public.profiles SET phone = '75999999999', city = 'Feira de Santana' WHERE id = auth.uid()$$,
  'membro atualiza campos permitidos do proprio perfil'
);
SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET role = 'master' WHERE id = auth.uid()$$,
  '42501',
  NULL,
  'membro nao promove o proprio role'
);
SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000010' WHERE id = auth.uid()$$,
  '42501',
  NULL,
  'membro nao altera o proprio tenant'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'member_avatars_owner_%'),
  3::BIGINT,
  'storage possui policies de escrita versionada do proprio membro'
);

RESET ROLE;
SELECT * FROM extensions.finish();
ROLLBACK;
