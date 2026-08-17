-- ============================================================================
-- RLS & SQL Homologation Test Suite — Migration 042 (Checkpoint 7A.1)
-- ============================================================================
-- Suite de homologação SQL para migração 042 (Benefícios e Serviços).
-- Executada dentro de uma única transação com ROLLBACK no final.
-- ============================================================================

BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.no_plan();

-- ---------------------------------------------------------------------------
-- 1. Setup de Fixtures: Tenant, Empresa Bronze, Prata, Ouro e Usuários
-- ---------------------------------------------------------------------------

-- Habilitar tenant de teste
UPDATE public.tenants
SET public_access_status = 'enabled'
WHERE id = '00000000-0000-0000-0000-000000000010';

INSERT INTO public.tenant_domains
  (id, tenant_id, domain, is_primary, is_verified, ssl_status)
VALUES
  ('00000000-0000-0000-0000-000000007a01',
   '00000000-0000-0000-0000-000000000010',
   'homolog-7a1.test', true, true, 'active')
ON CONFLICT (id) DO NOTHING;

-- Criar Empresas de Teste
INSERT INTO public.businesses
  (id, tenant_id, owner_id, name, description, category, plan_tier, slug,
   company_type, publication_status, is_active, cnpj, legal_name, email)
VALUES
  ('00000000-0000-0000-0000-000000007b01',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'Empresa Bronze Homolog', 'Empresa teste plano bronze', 'servicos', 'bronze',
   'empresa-bronze-homolog', 'commercial', 'published', true,
   '11111111000190', 'Razao Bronze LTDA', 'bronze@test.com'),

  ('00000000-0000-0000-0000-000000007b02',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'Empresa Prata Homolog', 'Empresa teste plano prata', 'servicos', 'prata',
   'empresa-prata-homolog', 'commercial', 'published', true,
   '22222222000190', 'Razao Prata LTDA', 'prata@test.com'),

  ('00000000-0000-0000-0000-000000007b03',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'Empresa Ouro Homolog', 'Empresa teste plano ouro', 'servicos', 'ouro',
   'empresa-ouro-homolog', 'commercial', 'published', true,
   '33333333000190', 'Razao Ouro LTDA', 'ouro@test.com')
ON CONFLICT (id) DO NOTHING;

-- Simular Subscrição Elegível Efetiva para Bronze, Prata e Ouro
INSERT INTO public.subscriptions
  (id, tenant_id, business_id, plan_version_id, status, current_period_start, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000007s01',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b01',
   '00000000-0000-0000-0000-000000000201', 'active', now() - interval '1 day', now() + interval '30 days'),
  ('00000000-0000-0000-0000-000000007s02',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b02',
   '00000000-0000-0000-0000-000000000202', 'active', now() - interval '1 day', now() + interval '30 days'),
  ('00000000-0000-0000-0000-000000007s03',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b03',
   '00000000-0000-0000-0000-000000000203', 'active', now() - interval '1 day', now() + interval '30 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Teste de Concorrência Temporal Instantânea em Benefícios (5 Casos)
-- ---------------------------------------------------------------------------

-- Caso A: Prata - 2 Campanhas Sequenciais (Permitido)
INSERT INTO public.business_benefits
  (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b02',
   'Prata Sequencial 1', 'Primeira quinzena de setembro',
   '2026-09-01 00:00:00+00', '2026-09-10 23:59:59+00', true),
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b02',
   'Prata Sequencial 2', 'Segunda quinzena de setembro',
   '2026-09-20 00:00:00+00', '2026-09-30 23:59:59+00', true);

SELECT is(
  (SELECT count(*)::int FROM public.business_benefits WHERE business_id = '00000000-0000-0000-0000-000000007b02'),
  2,
  'Prata permite agendamento de 2 campanhas sequenciais nao sobrepostas'
);

-- Caso B: Prata - Fronteira Exata [01/09 -> 10/09) e [10/09 -> 20/09) (Permitido)
INSERT INTO public.business_benefits
  (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b02',
   'Prata Fronteira 3', 'Inicio no exato instante de termino',
   '2026-09-10 23:59:59+00', '2026-09-15 00:00:00+00', true);

SELECT is(
  (SELECT count(*)::int FROM public.business_benefits WHERE business_id = '00000000-0000-0000-0000-000000007b02'),
  3,
  'Prata permite campanhas em que a segunda inicia no instante exato de termino da primeira'
);

-- Caso C: Prata - Tentativa de Sobreposição Temporal (Deve Falhar no Trigger)
PREPARE prata_overlap AS
  INSERT INTO public.business_benefits
    (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
  VALUES
    ('00000000-0000-0000-0000-000000000010',
     '00000000-0000-0000-0000-000000007b02',
     'Prata Sobreposta Rejeitada', 'Concorre em 05/09',
     '2026-09-05 00:00:00+00', '2026-09-12 00:00:00+00', true);

SELECT throws_ok(
  'prata_overlap',
  'Quota de benefícios simultaneamente ativos excedida para o plano prata (Máximo: 1 no instante 2026-09-05 00:00:00+00)',
  'Trigger bloqueia 2º beneficio Prata com sobreposicao temporal'
);

-- Caso D: Ouro - 3 Campanhas Simultâneas Sobrepostas (Permitido)
INSERT INTO public.business_benefits
  (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b03',
   'Ouro VIP 1', 'Campanha anual',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', true),
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b03',
   'Ouro VIP 2', 'Campanha de marco',
   '2026-03-01 00:00:00+00', '2026-03-31 23:59:59+00', true),
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b03',
   'Ouro VIP 3', 'Campanha fraterna marco',
   '2026-03-15 00:00:00+00', '2026-03-25 23:59:59+00', true);

SELECT is(
  (SELECT count(*)::int FROM public.business_benefits WHERE business_id = '00000000-0000-0000-0000-000000007b03'),
  3,
  'Ouro permite 3 beneficios simultaneamente ativos no mesmo instante'
);

-- Caso E: Ouro - 4ª Campanha Simultânea Sobreposta (Deve Falhar no Trigger)
PREPARE ouro_fourth_overlap AS
  INSERT INTO public.business_benefits
    (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
  VALUES
    ('00000000-0000-0000-0000-000000000010',
     '00000000-0000-0000-0000-000000007b03',
     'Ouro VIP 4 Rejeitada', 'Concorre em marco com mais 3',
     '2026-03-20 00:00:00+00', '2026-03-22 23:59:59+00', true);

SELECT throws_ok(
  'ouro_fourth_overlap',
  'Quota de benefícios simultaneamente ativos excedida para o plano ouro (Máximo: 3 no instante 2026-03-20 00:00:00+00)',
  'Trigger bloqueia 4º beneficio simultaneo no plano Ouro'
);

-- Caso F: Ouro - 4ª Campanha Sequencial Não Sobreposta em Abril (Permitido)
INSERT INTO public.business_benefits
  (tenant_id, business_id, title, description, valid_from, valid_until, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000007b03',
   'Ouro VIP 4 Sequencial', 'Campanha de abril',
   '2026-04-01 00:00:00+00', '2026-04-30 23:59:59+00', true);

SELECT is(
  (SELECT count(*)::int FROM public.business_benefits WHERE business_id = '00000000-0000-0000-0000-000000007b03'),
  4,
  'Ouro permite 4º beneficio cadastrado desde que nao haja mais de 3 simultaneos em nenhum instante t'
);

-- ---------------------------------------------------------------------------
-- 3. Teste de Quotas de Serviços (3 / 10 / 25)
-- ---------------------------------------------------------------------------

-- Inserir 3 serviços ativos em Bronze (Permitido)
INSERT INTO public.business_services (tenant_id, business_id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000007b01', 'Bronze S1', 'Desc 1'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000007b01', 'Bronze S2', 'Desc 2'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000007b01', 'Bronze S3', 'Desc 3');

SELECT is(
  (SELECT count(*)::int FROM public.business_services WHERE business_id = '00000000-0000-0000-0000-000000007b01'),
  3,
  'Bronze permite cadastrar ate 3 servicos ativos'
);

-- Tentativa de 4º serviço em Bronze (Deve Falhar)
PREPARE bronze_fourth_service AS
  INSERT INTO public.business_services (tenant_id, business_id, name, description)
  VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000007b01', 'Bronze S4', 'Desc 4');

SELECT throws_ok(
  'bronze_fourth_service',
  'Quota de serviços ativos excedida para o plano bronze (Máximo: 3)',
  'Trigger bloqueia 4º servico em plano Bronze'
);

-- ---------------------------------------------------------------------------
-- 4. Teste de Sanitização na RPC public_business_detail
-- ---------------------------------------------------------------------------

-- Chamada RPC pública sob host e slug da empresa Bronze
SELECT is(
  (SELECT jsonb_array_length(s.services) FROM public.public_business_detail('homolog-7a1.test', 'empresa-bronze-homolog') s),
  3,
  'RPC publica retorna exatamente 3 servicos para a empresa Bronze'
);

SELECT is(
  (SELECT (s.services->0->>'description') IS NULL FROM public.public_business_detail('homolog-7a1.test', 'empresa-bronze-homolog') s),
  true,
  'RPC publica sanitiza description para NULL sob plano Bronze'
);

SELECT is(
  (SELECT jsonb_array_length(s.benefits) FROM public.public_business_detail('homolog-7a1.test', 'empresa-bronze-homolog') s),
  0,
  'RPC publica retorna 0 beneficios para a empresa Bronze'
);

-- ---------------------------------------------------------------------------
-- 5. Teste de RLS Privada para anon e authenticated
-- ---------------------------------------------------------------------------

-- Mudar role para anon
SET LOCAL ROLE anon;

SELECT is_empty(
  'SELECT * FROM public.business_benefits WHERE business_id = ''00000000-0000-0000-0000-000000007b03''',
  'Role anon nao possui permissao de SELECT em business_benefits'
);

SELECT is_empty(
  'SELECT * FROM public.business_services WHERE business_id = ''00000000-0000-0000-0000-000000007b01''',
  'Role anon nao possui permissao de SELECT em business_services'
);

-- Restaurar role administrativa para finalização limpa da transação
RESET ROLE;

SELECT * FROM extensions.finish();
ROLLBACK;
