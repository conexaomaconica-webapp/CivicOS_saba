-- ============================================================================
-- RLS / public-contract regression suite for proposed migrations 040-041
-- ============================================================================
-- Runs inside one transaction and rolls every fixture back.
-- Required execution role: local postgres (the assertions switch to anon and
-- authenticated explicitly). Never run this file against production.
-- ============================================================================

BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT extensions.no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures: two public tenants, published/draft businesses and authorities
-- ---------------------------------------------------------------------------

UPDATE public.tenants
SET public_access_status = 'enabled'
WHERE id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
);

INSERT INTO public.tenant_domains
  (id, tenant_id, domain, is_primary, is_verified, ssl_status)
VALUES
  ('00000000-0000-0000-0000-000000004001',
   '00000000-0000-0000-0000-000000000010',
   'tenant-a.test', true, true, 'active'),
  ('00000000-0000-0000-0000-000000004002',
   '00000000-0000-0000-0000-000000000011',
   'tenant-b.test', true, true, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses
  (id, tenant_id, owner_id, name, description, category, plan_tier, slug,
   company_type, publication_status, is_active, cnpj, legal_name, email)
VALUES
  ('00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Publicada', 'Registro publico do tenant A', 'servicos', 'ouro',
   'rls-publicada', 'commercial', 'published', true,
   '12345678000190', 'Razao Privada A', 'privado-a@example.test'),
  ('00000000-0000-0000-0000-000000004102',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Rascunho', 'Nao deve aparecer', 'servicos', 'ouro',
   'rls-rascunho', 'commercial', 'draft', true,
   '12345678000191', 'Razao Privada Draft', 'draft@example.test'),
  ('00000000-0000-0000-0000-000000004103',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000101',
   'RLS Outro Tenant', 'Registro do tenant B', 'servicos', 'ouro',
   'rls-outro-tenant', 'commercial', 'published', true,
   '12345678000192', 'Razao Privada B', 'privado-b@example.test'),
  ('00000000-0000-0000-0000-000000004104',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Fundador Reservado', 'Reserva nao concede selo', 'servicos', 'bronze',
   'rls-founder-reserved', 'commercial', 'published', true,
   '12345678000193', 'Razao Privada Reserva', 'reserva@example.test'),
  ('00000000-0000-0000-0000-000000004105',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Fundador Granted', 'Grant concede selo', 'servicos', 'bronze',
   'rls-founder-granted', 'commercial', 'published', true,
   '12345678000194', 'Razao Privada Grant', 'grant@example.test'),
  ('00000000-0000-0000-0000-000000004106',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Credencial Errada', 'Outra credencial nao verifica cadastro', 'servicos', 'bronze',
   'rls-wrong-credential', 'commercial', 'published', true,
   '12345678000195', 'Razao Privada Credencial', 'credencial@example.test'),
  ('00000000-0000-0000-0000-000000004107',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Inativa', 'Publicada mas inativa', 'servicos', 'bronze',
   'rls-inativa', 'commercial', 'published', false,
   '12345678000196', 'Razao Privada Inativa', 'inativa@example.test'),
  ('00000000-0000-0000-0000-000000004108',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Credencial Revogada', 'Credencial revogada nao verifica', 'servicos', 'bronze',
   'rls-revoked-credential', 'commercial', 'published', true,
   '12345678000197', 'Razao Privada Revogada', 'revogada@example.test'),
  ('00000000-0000-0000-0000-000000004109',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Entitlement Expirado', 'Grant expirado nao libera plano', 'servicos', 'ouro',
   'rls-expired-entitlement', 'commercial', 'published', true,
   '12345678000198', 'Razao Privada Entitlement', 'entitlement@example.test'),
  ('00000000-0000-0000-0000-000000004110',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000103',
   'RLS Assinatura Ambigua', 'Duas assinaturas elegiveis falham fechado', 'servicos', 'ouro',
   'rls-ambiguous-subscription', 'commercial', 'published', true,
   '12345678000199', 'Razao Privada Ambigua', 'ambigua@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_members
  (tenant_id, business_id, user_id, role, status)
SELECT b.tenant_id, b.id, '00000000-0000-0000-0000-000000000103', 'owner', 'active'
FROM public.businesses b
WHERE b.id IN (
  '00000000-0000-0000-0000-000000004101',
  '00000000-0000-0000-0000-000000004102',
  '00000000-0000-0000-0000-000000004104',
  '00000000-0000-0000-0000-000000004105',
  '00000000-0000-0000-0000-000000004106',
  '00000000-0000-0000-0000-000000004107',
  '00000000-0000-0000-0000-000000004108',
  '00000000-0000-0000-0000-000000004109',
  '00000000-0000-0000-0000-000000004110'
)
ON CONFLICT (business_id, user_id) DO NOTHING;

UPDATE public.profiles
SET name = 'Responsavel Publico RLS'
WHERE id = '00000000-0000-0000-0000-000000000103';

INSERT INTO public.business_masonic_links
  (id, tenant_id, business_id, declaring_user_id, link_type,
   status, is_primary)
VALUES
  ('00000000-0000-0000-0000-000000004151',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000000103',
   'owner', 'draft', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_masonic_link_authorizations
  (id, tenant_id, link_id, authorized_by_name, authorized_by_role,
   authorization_type, authorization_scope, status)
VALUES
  ('00000000-0000-0000-0000-000000004152',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004151',
   'Diretoria RLS', 'Diretor', 'owner_declaration', 'company_listing', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_masonic_link_publication_consents
  (id, tenant_id, link_id, visibility_scope, display_name,
   display_business_role, display_organization, granted)
VALUES
  ('00000000-0000-0000-0000-000000004153',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004151',
   'public_all', true, true, false, true)
ON CONFLICT (id) DO NOTHING;

-- A transicao para active passa pelo guard de 036 e por um moderador real.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  true
);
SET LOCAL ROLE authenticated;
UPDATE public.business_masonic_links
SET status = 'active',
    verified_by = '00000000-0000-0000-0000-000000000102',
    verified_at = statement_timestamp()
WHERE id = '00000000-0000-0000-0000-000000004151';
RESET ROLE;

INSERT INTO public.tenant_public_home_content
  (id, tenant_id, hero_title, publication_status, published_at)
VALUES
  ('00000000-0000-0000-0000-000000004201',
   '00000000-0000-0000-0000-000000000010',
   'Home publica de teste', 'published', statement_timestamp())
ON CONFLICT (tenant_id) DO UPDATE
SET hero_title = EXCLUDED.hero_title,
    publication_status = EXCLUDED.publication_status,
    published_at = EXCLUDED.published_at;

INSERT INTO public.business_reviews
  (id, tenant_id, business_id, user_id, rating, comment,
   moderation_status, moderated_by, moderated_at)
VALUES
  ('00000000-0000-0000-0000-000000004301',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000000103',
   1, 'Pendente nao publica', 'pending', NULL, NULL),
  ('00000000-0000-0000-0000-000000004302',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000000103',
   5, 'Publicada e moderada', 'published',
   '00000000-0000-0000-0000-000000000102', statement_timestamp()),
  ('00000000-0000-0000-0000-000000004303',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000000103',
   2, 'Rejeitada nao publica', 'rejected',
   '00000000-0000-0000-0000-000000000102', statement_timestamp())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.founder_allocations
  (id, campaign_id, tenant_id, business_id, user_id, slot_number,
   status, expires_at, granted_at)
SELECT
  '00000000-0000-0000-0000-000000004401', fc.id,
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000004104',
  '00000000-0000-0000-0000-000000000103', 91,
  'reserved', statement_timestamp() + interval '30 minutes', NULL
FROM public.founder_campaigns fc
WHERE fc.code = 'FUNDADOR599'
ON CONFLICT (id) DO NOTHING;

-- Mesmo com Fundador granted no tenant B, o host do tenant A nunca o enxerga.
INSERT INTO public.founder_allocations
  (id, campaign_id, tenant_id, business_id, user_id, slot_number,
   status, expires_at, granted_at)
SELECT
  '00000000-0000-0000-0000-000000004403', fc.id,
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000004103',
  '00000000-0000-0000-0000-000000000101', 93,
  'granted', NULL, statement_timestamp()
FROM public.founder_campaigns fc
WHERE fc.code = 'FUNDADOR599'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.founder_allocations
  (id, campaign_id, tenant_id, business_id, user_id, slot_number,
   status, expires_at, granted_at)
SELECT
  '00000000-0000-0000-0000-000000004402', fc.id,
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000004105',
  '00000000-0000-0000-0000-000000000103', 92,
  'granted', NULL, statement_timestamp()
FROM public.founder_campaigns fc
WHERE fc.code = 'FUNDADOR599'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credential_types
  (id, tenant_id, code, name, requires_evidence)
VALUES
  ('00000000-0000-0000-0000-000000004501', NULL,
   'community_relationship_verification', 'Vinculo comunitario', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credential_issuances
  (id, tenant_id, credential_type_id, business_id, status,
   requested_by, issued_at, verified_by)
SELECT
  '00000000-0000-0000-0000-000000004502',
  '00000000-0000-0000-0000-000000000010', ct.id,
  '00000000-0000-0000-0000-000000004101', 'verified',
  '00000000-0000-0000-0000-000000000103', statement_timestamp(),
  '00000000-0000-0000-0000-000000000102'
FROM public.credential_types ct
WHERE ct.tenant_id IS NULL AND ct.code = 'business_registration_verification'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credential_issuances
  (id, tenant_id, credential_type_id, business_id, status,
   requested_by, issued_at, verified_by)
SELECT
  '00000000-0000-0000-0000-000000004504',
  '00000000-0000-0000-0000-000000000010', ct.id,
  '00000000-0000-0000-0000-000000004108', 'revoked',
  '00000000-0000-0000-0000-000000000103', statement_timestamp(),
  '00000000-0000-0000-0000-000000000102'
FROM public.credential_types ct
WHERE ct.tenant_id IS NULL AND ct.code = 'business_registration_verification'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credential_issuances
  (id, tenant_id, credential_type_id, business_id, status,
   requested_by, issued_at, verified_by)
VALUES
  ('00000000-0000-0000-0000-000000004503',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004501',
   '00000000-0000-0000-0000-000000004106', 'verified',
   '00000000-0000-0000-0000-000000000103', statement_timestamp(),
   '00000000-0000-0000-0000-000000000102')
ON CONFLICT (id) DO NOTHING;

-- businesses.plan_tier = ouro, entitlement ativo, mas assinatura expirada:
-- o contrato deve retornar plano NULL e nunca fazer downgrade implicito.
INSERT INTO public.plans (id, tenant_id, code, name, is_active)
VALUES
  ('00000000-0000-0000-0000-000000004601',
   '00000000-0000-0000-0000-000000000010', 'ouro-test', 'Ouro RLS', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.plan_versions
  (id, plan_id, version, price_annual, currency, effective_from)
VALUES
  ('00000000-0000-0000-0000-000000004602',
   '00000000-0000-0000-0000-000000004601', 1, 499, 'BRL',
   statement_timestamp() - interval '1 year')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions
  (id, tenant_id, business_id, plan_version_id, status,
   current_period_start, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000004603',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000004602', 'expired',
   statement_timestamp() - interval '1 year',
   statement_timestamp() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_definitions
  (id, code, name, value_type)
VALUES
  ('00000000-0000-0000-0000-000000004604',
   'directory.premium_visuals', 'Visual premium', 'boolean')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_sources
  (id, tenant_id, source_type, source_reference_id)
VALUES
  ('00000000-0000-0000-0000-000000004605',
   '00000000-0000-0000-0000-000000000010', 'plan_version',
   '00000000-0000-0000-0000-000000004602')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_grants
  (id, tenant_id, business_id, entitlement_id, source_id,
   status, value_boolean, valid_from)
VALUES
  ('00000000-0000-0000-0000-000000004606',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004101',
   '00000000-0000-0000-0000-000000004604',
   '00000000-0000-0000-0000-000000004605',
   'active', true, statement_timestamp() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Assinatura ativa sem entitlement vigente: falha fechado.
INSERT INTO public.subscriptions
  (id, tenant_id, business_id, plan_version_id, status,
   current_period_start, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000004609',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004109',
   '00000000-0000-0000-0000-000000004602', 'active',
   statement_timestamp() - interval '1 day',
   statement_timestamp() + interval '1 year')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_grants
  (id, tenant_id, business_id, entitlement_id, source_id,
   status, value_boolean, valid_from, valid_until)
VALUES
  ('00000000-0000-0000-0000-000000004610',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004109',
   '00000000-0000-0000-0000-000000004604',
   '00000000-0000-0000-0000-000000004605',
   'expired', true, statement_timestamp() - interval '2 days',
   statement_timestamp() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Uma assinatura ativa e outra cancelada ainda em acesso sao ambiguas. O
-- resolver nao escolhe arbitrariamente nenhuma delas.
INSERT INTO public.subscriptions
  (id, tenant_id, business_id, plan_version_id, status,
   current_period_start, current_period_end, access_ends_at)
VALUES
  ('00000000-0000-0000-0000-000000004611',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004110',
   '00000000-0000-0000-0000-000000004602', 'active',
   statement_timestamp() - interval '1 day',
   statement_timestamp() + interval '1 year', NULL),
  ('00000000-0000-0000-0000-000000004612',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004110',
   '00000000-0000-0000-0000-000000004602', 'canceled',
   statement_timestamp() - interval '2 days',
   statement_timestamp() + interval '1 year',
   statement_timestamp() + interval '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_grants
  (id, tenant_id, business_id, entitlement_id, source_id,
   status, value_boolean, valid_from)
VALUES
  ('00000000-0000-0000-0000-000000004613',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004110',
   '00000000-0000-0000-0000-000000004604',
   '00000000-0000-0000-0000-000000004605',
   'active', true, statement_timestamp() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Controle positivo: assinatura ativa + mesma plan_version + grant vigente.
INSERT INTO public.subscriptions
  (id, tenant_id, business_id, plan_version_id, status,
   current_period_start, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000004607',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004105',
   '00000000-0000-0000-0000-000000004602', 'active',
   statement_timestamp() - interval '1 day',
   statement_timestamp() + interval '1 year')
ON CONFLICT (id) DO NOTHING;

-- Volume para provar que p_limit acima do contrato e limitado a 50 linhas.
INSERT INTO public.businesses
  (id, tenant_id, owner_id, name, description, category, plan_tier, slug,
   company_type, publication_status, is_active)
SELECT
  ('00000000-0000-0000-0000-' || lpad((5000 + g)::TEXT, 12, '0'))::UUID,
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'RLS Paginacao ' || lpad(g::TEXT, 2, '0'),
  'Fixture de limite', 'servicos', 'bronze',
  'rls-page-' || lpad(g::TEXT, 2, '0'),
  'commercial', 'published', true
FROM generate_series(1, 55) AS g
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entitlement_grants
  (id, tenant_id, business_id, entitlement_id, source_id,
   status, value_boolean, valid_from)
VALUES
  ('00000000-0000-0000-0000-000000004608',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000004105',
   '00000000-0000-0000-0000-000000004604',
   '00000000-0000-0000-0000-000000004605',
   'active', true, statement_timestamp() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations
  (id, tenant_id, name, potency, is_active, public_slug,
   publication_status, city, state)
VALUES
  ('00000000-0000-0000-0000-000000004701',
   '00000000-0000-0000-0000-000000000010',
   'Loja Publicada RLS', 'GLESP', true, 'loja-publicada-rls',
   'published', 'Sao Paulo', 'SP'),
  ('00000000-0000-0000-0000-000000004702',
   '00000000-0000-0000-0000-000000000010',
   'Loja Rascunho RLS', 'GLESP', true, 'loja-rascunho-rls',
   'draft', 'Sao Paulo', 'SP')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Assertions as database owner: grants and private-column shape
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA extensions TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated;

SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.businesses', 'SELECT'),
  'RLS-001 anon nao possui SELECT direto em businesses'
);
SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.tenants', 'SELECT'),
  'RLS-002 anon nao possui SELECT direto em tenants'
);
SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.business_reviews', 'SELECT'),
  'RLS-003 anon nao possui SELECT direto em business_reviews'
);
SELECT extensions.is(
  (
    SELECT count(*)::BIGINT
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'public_tenant_branding', 'public_home_content',
        'public_directory_search', 'public_business_detail',
        'public_business_reviews', 'public_masonic_lodges'
      )
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
  ),
  6::BIGINT,
  'RPC-001 as seis RPCs publicas pertencem a postgres'
);
SELECT extensions.is(
  (
    SELECT count(*)::BIGINT
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'public_tenant_branding', 'public_home_content',
        'public_directory_search', 'public_business_detail',
        'public_business_reviews', 'public_masonic_lodges'
      )
      AND EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS c(value)
        WHERE c.value IN ('search_path=', 'search_path=""')
      )
  ),
  6::BIGINT,
  'RPC-002 as seis RPCs SECURITY DEFINER usam search_path vazio'
);
SELECT extensions.is(
  (
    SELECT count(*)::BIGINT
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'public_tenant_branding', 'public_home_content',
        'public_directory_search', 'public_business_detail',
        'public_business_reviews', 'public_masonic_lodges'
      )
  ),
  6::BIGINT,
  'RPC-003 nao existe overload das seis RPCs publicas'
);
SELECT extensions.is(
  (
    SELECT count(*)::BIGINT
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'public_tenant_branding', 'public_home_content',
        'public_directory_search', 'public_business_detail',
        'public_business_reviews', 'public_masonic_lodges'
      )
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      )
  ),
  6::BIGINT,
  'RPC-004 grants existem apenas para anon/authenticated, nao PUBLIC'
);
SELECT extensions.ok(
  NOT has_function_privilege('anon', 'public._business_is_founder(uuid,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public._business_is_founder(uuid,uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public._business_is_founder(uuid,uuid)', 'EXECUTE'),
  'RPC-005 helper de autoridade e interno e restrito a service_role'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('tenant-a.test')),
  1::BIGINT, 'RLS-010 host verificado resolve tenant'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('HTTPS://WWW.TENANT-A.TEST:443/')),
  1::BIGINT, 'RLS-011 protocolo, caixa, www, porta e barra sao normalizados'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('unknown.example')),
  0::BIGINT, 'RLS-012 host desconhecido falha fechado'
);
SELECT extensions.is(
  (
    SELECT count(*)::BIGINT
    FROM (
      SELECT * FROM public.public_tenant_branding('tenant-a.test@evil.example')
      UNION ALL
      SELECT * FROM public.public_tenant_branding('tenant-a.test.evil.example')
    ) spoofed
  ),
  0::BIGINT, 'RLS-013 host spoofed nao resolve tenant'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_home_content('tenant-a.test')),
  1::BIGINT, 'RLS-014 Home publicada retorna pelo host'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test', p_query => 'RLS Publicada') d WHERE d.business_slug = 'rls-publicada'),
  1::BIGINT, 'RLS-015 empresa ativa e publicada aparece'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test') d WHERE d.business_slug = 'rls-rascunho'),
  0::BIGINT, 'RLS-016 empresa ativa nao publicada nao aparece'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test') d WHERE d.business_slug = 'rls-inativa'),
  0::BIGINT, 'RLS-017 empresa publicada inativa nao aparece'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test') d WHERE d.business_slug = 'rls-outro-tenant'),
  0::BIGINT, 'RLS-018 empresa de outro tenant nao aparece'
);
SELECT extensions.ok(
  NOT (
    SELECT to_jsonb(d) ?| ARRAY['tenant_id', 'owner_id', 'cnpj', 'legal_name', 'email', 'settings']
    FROM public.public_business_detail('tenant-a.test', 'rls-publicada') d
  ),
  'RLS-019 detalhe nao expoe campos privados'
);
SELECT extensions.ok(
  (
    SELECT d.responsible ->> 'name' = 'Responsavel Publico RLS'
      AND NOT d.responsible ?| ARRAY['user_id', 'owner_id', 'cimb_code', 'email']
    FROM public.public_business_detail('tenant-a.test', 'rls-publicada') d
  ),
  'RLS-020 responsavel consentido e minimizado aparece'
);
SELECT extensions.is(
  (SELECT d.effective_plan_code FROM public.public_business_detail('tenant-a.test', 'rls-publicada') d),
  NULL::TEXT, 'RLS-021 assinatura inativa e plan_tier legado nao liberam plano'
);
SELECT extensions.is(
  (SELECT d.is_verified FROM public.public_business_detail('tenant-a.test', 'rls-publicada') d),
  true, 'RLS-022 credencial cadastral correta verifica empresa'
);
SELECT extensions.is(
  (SELECT d.is_verified FROM public.public_business_detail('tenant-a.test', 'rls-wrong-credential') d),
  false, 'RLS-023 tipo de credencial incorreto nao verifica empresa'
);
SELECT extensions.is(
  (SELECT d.is_verified FROM public.public_business_detail('tenant-a.test', 'rls-revoked-credential') d),
  false, 'RLS-024 credencial revogada nao verifica empresa'
);
SELECT extensions.is(
  (SELECT d.is_founder FROM public.public_business_detail('tenant-a.test', 'rls-founder-reserved') d),
  false, 'RLS-025 Fundador reservado nao concede selo'
);
SELECT extensions.is(
  (SELECT d.is_founder FROM public.public_business_detail('tenant-a.test', 'rls-founder-granted') d),
  true, 'RLS-026 Fundador granted concede selo'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_business_detail('tenant-a.test', 'rls-outro-tenant')),
  0::BIGINT, 'RLS-027 Fundador de outro tenant nao cruza host'
);
SELECT extensions.is(
  (SELECT d.effective_plan_code FROM public.public_business_detail('tenant-a.test', 'rls-founder-granted') d),
  'ouro-test'::TEXT, 'RLS-028 assinatura, versao e grant vigentes resolvem plano'
);
SELECT extensions.is(
  (SELECT d.effective_plan_code FROM public.public_business_detail('tenant-a.test', 'rls-expired-entitlement') d),
  NULL::TEXT, 'RLS-029 entitlement expirado nao libera plano'
);
SELECT extensions.is(
  (SELECT d.effective_plan_code FROM public.public_business_detail('tenant-a.test', 'rls-ambiguous-subscription') d),
  NULL::TEXT, 'RLS-030 assinatura ambigua falha fechado'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_business_reviews('tenant-a.test', 'rls-publicada')),
  1::BIGINT, 'RLS-031 somente review publicada aparece'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_business_reviews('tenant-a.test', 'rls-publicada') r WHERE r.comment IN ('Pendente nao publica', 'Rejeitada nao publica')),
  0::BIGINT, 'RLS-032 reviews pendente e rejeitada nao aparecem'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_masonic_lodges('tenant-a.test')),
  1::BIGINT, 'RLS-033 somente loja publicada aparece'
);
SELECT extensions.throws_ok(
  $$SELECT 1 FROM public.businesses LIMIT 1$$,
  '42501'
);
SELECT extensions.throws_ok(
  $$SELECT public._business_is_founder('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000004105')$$,
  '42501'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test', p_limit => 1000)),
  50::BIGINT, 'RLS-036 paginacao acima do limite e truncada em 50'
);
SELECT extensions.lives_ok(
  $$SELECT count(*) FROM public.public_directory_search('tenant-a.test', '" ) OR 1=1 -- & maçônica')$$,
  'RLS-037 busca com caracteres especiais nao quebra nem injeta SQL'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test', repeat('x', 129))),
  0::BIGINT, 'RLS-038 busca acima de 128 caracteres falha fechado'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_directory_search('tenant-a.test', p_after_name => 'RLS')),
  0::BIGINT, 'RLS-039 cursor parcial falha fechado'
);

RESET ROLE;

-- Revogacao de consentimento remove imediatamente o responsavel da projecao.
UPDATE public.business_masonic_link_publication_consents
SET granted = false, revoked_at = statement_timestamp()
WHERE id = '00000000-0000-0000-0000-000000004153';
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT extensions.is(
  (SELECT d.responsible FROM public.public_business_detail('tenant-a.test', 'rls-publicada') d),
  NULL::JSONB, 'RLS-040 responsavel com consentimento revogado nao aparece'
);
RESET ROLE;
UPDATE public.business_masonic_link_publication_consents
SET granted = true, revoked_at = NULL
WHERE id = '00000000-0000-0000-0000-000000004153';

-- Tenant nao publicavel falha fechado mesmo com dominio verificado.
UPDATE public.tenants SET public_access_status = 'disabled'
WHERE id = '00000000-0000-0000-0000-000000000011';
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('tenant-b.test')),
  0::BIGINT, 'RLS-041 tenant nao publicavel nao resolve'
);
RESET ROLE;
UPDATE public.tenants SET public_access_status = 'enabled'
WHERE id = '00000000-0000-0000-0000-000000000011';

-- O indice bloqueia variantes ambiguas e o resolver tambem falha fechado caso
-- a invariavel seja removida acidentalmente.
SELECT extensions.throws_ok(
  $$INSERT INTO public.tenant_domains (tenant_id, domain, is_verified, ssl_status)
    VALUES ('00000000-0000-0000-0000-000000000011', 'www.tenant-a.test', true, 'active')$$,
  '23505'
);
DROP INDEX public.uq_tenant_domains_domain_normalized;
INSERT INTO public.tenant_domains
  (id, tenant_id, domain, is_primary, is_verified, ssl_status)
VALUES
  ('00000000-0000-0000-0000-000000004003',
   '00000000-0000-0000-0000-000000000011',
   'TENANT-A.TEST', false, true, 'active');
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('tenant-a.test')),
  0::BIGINT, 'RLS-043 dominio ambiguo falha fechado sem escolher tenant'
);
RESET ROLE;
DELETE FROM public.tenant_domains WHERE id = '00000000-0000-0000-0000-000000004003';
CREATE UNIQUE INDEX uq_tenant_domains_domain_normalized
  ON public.tenant_domains (
    lower(regexp_replace(rtrim(btrim(domain), '.'), '^www\.', '', 'i'))
  );

-- ---------------------------------------------------------------------------
-- Authenticated user from tenant A
-- ---------------------------------------------------------------------------

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.businesses b WHERE b.id = '00000000-0000-0000-0000-000000004101'),
  1::BIGINT, 'RLS-050 anunciante le empresa autorizada'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.businesses b WHERE b.id = '00000000-0000-0000-0000-000000004103'),
  0::BIGINT, 'RLS-051 anunciante nao le empresa de outro tenant'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.tenants t WHERE t.id = '00000000-0000-0000-0000-000000000010'),
  1::BIGINT, 'RLS-052 membro autenticado le seu tenant'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.profiles p WHERE p.id = auth.uid()),
  1::BIGINT, 'RLS-053 usuario autenticado le o proprio perfil'
);
SELECT extensions.ok(
  has_table_privilege('authenticated', 'public.business_favorites', 'SELECT'),
  'RLS-054 favoritos autenticados mantem privilegio de leitura'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.public_tenant_branding('tenant-a.test')),
  1::BIGINT, 'RLS-055 contrato publico tambem funciona autenticado'
);
SELECT extensions.throws_ok(
  $$UPDATE public.businesses SET plan_tier = 'prata'
    WHERE id = '00000000-0000-0000-0000-000000004101'$$,
  'P0001', 'BUSINESS_PLAN_TIER_IS_SERVER_MANAGED',
  'RLS-056 alteracao direta de plan_tier e bloqueada'
);

RESET ROLE;

-- Tenant Admin preserva os paineis administrativos apos retirar SELECT anon.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.tenant_settings ts WHERE ts.tenant_id = '00000000-0000-0000-0000-000000000010'),
  1::BIGINT, 'RLS-060 Tenant Admin le configuracao operacional'
);
SELECT extensions.is(
  (SELECT count(*)::BIGINT FROM public.tenant_public_home_content h WHERE h.tenant_id = '00000000-0000-0000-0000-000000000010'),
  1::BIGINT, 'RLS-061 Tenant Admin le conteudo da Home'
);
SELECT extensions.ok(
  (SELECT count(*) > 0 FROM public.businesses b WHERE b.tenant_id = '00000000-0000-0000-0000-000000000010'),
  'RLS-062 Tenant Admin le empresas do tenant'
);
RESET ROLE;

SELECT * FROM extensions.finish();
ROLLBACK;
