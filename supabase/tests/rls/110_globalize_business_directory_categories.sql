-- Execute somente no ambiente local de testes com pgTAP, apos a migration 110.
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.plan(3);

INSERT INTO public.tenants (id, name, slug, public_access_status)
VALUES ('00000000-0000-0000-0000-000000110001', 'Tenant Teste 110', 'tenant-teste-110', 'disabled')
ON CONFLICT (id) DO NOTHING;

SELECT extensions.ok(
  NOT EXISTS (SELECT 1 FROM public.categories WHERE tenant_id IS NOT NULL),
  'catalogo ativo nao possui categorias vinculadas a tenant'
);

SELECT extensions.throws_ok(
  $$INSERT INTO public.categories (tenant_id, name, slug) VALUES ('00000000-0000-0000-0000-000000110001', 'Invalida', 'invalida-110')$$,
  '23514',
  NULL,
  'banco bloqueia nova categoria tenant-scoped'
);

SELECT extensions.lives_ok(
  $$INSERT INTO public.categories (tenant_id, name, slug) VALUES (NULL, 'Global 110', 'global-110')$$,
  'banco permite categoria global'
);

SELECT * FROM extensions.finish();
ROLLBACK;
