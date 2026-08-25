-- ============================================================================
-- CivicOS - Conexão Maçônica · Seed de Desenvolvimento (Sprint 0 · INF-001)
-- ============================================================================
-- Rodado após as migrations (supabase db reset / db seed). Cria fixtures
-- determinísticas (UUIDs fixos) para o tenant master, tenant demo, usuários de
-- teste, planos e categorias — base para o smoke do Gate 1 e para a suíte RLS.
--
-- NOTA: a trigger `handle_new_user` cria `profiles` e `tenant_members`
-- automaticamente a partir de `raw_user_meta_data`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenants
-- ---------------------------------------------------------------------------

INSERT INTO public.tenants (id, name, slug, public_access_status, settings)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CivicOS Master', 'civicos-master', 'enabled', '{"is_platform_root": true}'),
  ('00000000-0000-0000-0000-000000000010', 'Grande Oriente de SP', 'grande-oriente-sp', 'enabled', '{"branding": {"appName": "Conexão Maçônica", "primaryColor": "#4A0E1A", "accentColor": "#C9A227", "radius": "lg", "density": "comfortable", "colorMode": "light"}}'),
  ('00000000-0000-0000-0000-000000000011', 'Loja Luz do Oriente', 'luz-do-oriente', 'enabled', '{"branding": {"appName": "Luz do Oriente", "primaryColor": "#0F5132", "accentColor": "#F59E0B", "radius": "md", "density": "compact", "colorMode": "light"}}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_domains (tenant_id, domain, is_primary, is_verified, ssl_status)
VALUES
  ('00000000-0000-0000-0000-000000000010', '127.0.0.1', true, true, 'active'),
  ('00000000-0000-0000-0000-000000000010', 'localhost', false, true, 'active')
ON CONFLICT (domain) DO UPDATE SET is_verified = true, ssl_status = 'active';

-- ---------------------------------------------------------------------------
-- 2. Usuários (auth.users) — a trigger cria profiles + tenant_members
-- ---------------------------------------------------------------------------

-- Master (Eduardo / superadministrador da plataforma)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000101',
  'authenticated', 'authenticated', 'master@civicos.local',
  crypt('senha-master-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"master","tenant_id":"00000000-0000-0000-0000-000000000001"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Admin do tenant demo (socio_admin → atende has_tenant_admin_access)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000102',
  'authenticated', 'authenticated', 'admin@demo.local',
  crypt('senha-admin-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"socio_admin","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Usuário anunciante comum do tenant demo
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000103',
  'authenticated', 'authenticated', 'anunciante@demo.local',
  crypt('senha-anunciante-123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"anunciante","tenant_id":"00000000-0000-0000-0000-000000000010"}',
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Planos dos tenants (migration 004 só popula tenants existentes)
-- ---------------------------------------------------------------------------

INSERT INTO public.tenant_plans (tenant_id, tier, price_annual)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'bronze', 0.00),
  ('00000000-0000-0000-0000-000000000010', 'prata', 299.00),
  ('00000000-0000-0000-0000-000000000010', 'ouro', 499.00),
  ('00000000-0000-0000-0000-000000000011', 'bronze', 0.00)
ON CONFLICT (tenant_id, tier) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Configuração operacional do tenant demo
-- ---------------------------------------------------------------------------

INSERT INTO public.tenant_settings (tenant_id, support_email, whatsapp_number, timezone, currency)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'admin@demo.local', '+5511999999999', 'America/Sao_Paulo', 'BRL')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'directory.enabled', true),
  ('00000000-0000-0000-0000-000000000010', 'billing.enabled', true)
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Categorias globais (tenant_id NULL)
-- ---------------------------------------------------------------------------

INSERT INTO public.categories (tenant_id, parent_id, name, slug, icon, display_order, is_active)
VALUES
  (NULL, NULL, 'Alimentos e Bebidas', 'alimentos-e-bebidas', 'utensils', 10, true),
  (NULL, NULL, 'Artesanato', 'artesanato', 'hand', 20, true),
  (NULL, NULL, 'Imóveis e Construção', 'imoveis-e-construcao', 'building', 30, true),
  (NULL, NULL, 'Saúde e Bem-estar', 'saude-e-bem-estar', 'heart', 40, true),
  (NULL, NULL, 'Serviços', 'servicos', 'briefcase', 50, true)
ON CONFLICT (slug) WHERE tenant_id IS NULL DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Empresas de teste publicadas (Bronze, Prata, Ouro, Fundador)
-- ---------------------------------------------------------------------------

-- 6.1. Empresa Ouro: Padaria Estrela
INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Padaria & Confeitaria Estrela', 'Padaria artesanal premiada com tradição de 30 anos. Pães de fermentação natural e café colonial.', 'alimentos-e-bebidas',
  NULL, '+5511988887777', 'contato@padariaestrela.local', 'https://padariaestrela.local', 'Rua das Flores, 123 — Moema, São Paulo, SP',
  'ouro', 'padaria-estrela-ouro', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

-- 6.2. Empresa Bronze: Saba Advocacia
INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Saba Advocacia', 'Assessoria jurídica empresarial, contratos e consultoria com atendimento próximo e personalizado.', 'servicos',
  NULL, '+557530254242', 'contato@sabaadvocacia.local', 'https://sabaadvocacia.local', 'Av. Getúlio Vargas, 1240 — Centro, Feira de Santana, BA',
  'bronze', 'saba-advocacia-bronze', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

-- 6.3. Empresa Prata: Auto Centro Express
INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Auto Centro Express', 'Oficina especializada em mecânica geral, alinhamento 3D, balanceamento, injeção eletrônica e revisão preventiva.', 'servicos',
  NULL, '+551134567890', 'atendimento@autocentroexpress.local', 'https://autocentroexpress.local', 'Av. Paulista, 1500 — Bela Vista, São Paulo, SP',
  'prata', 'auto-centro-prata', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

-- 6.4. Empresa Fundadora (Ouro): Grupo Construtor Alfa
INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Grupo Construtor Alfa', 'Engenharia, loteamentos residenciais e empreendimentos imobiliários de alto padrão. Empresa pilar da comunidade.', 'imoveis-e-construcao',
  NULL, '+551140049000', 'contato@grupoalfa.local', 'https://grupoalfa.local', 'Av. Brigadeiro Faria Lima, 3400 — Itaim Bibi, São Paulo, SP',
  'ouro', 'grupo-alfa-fundador', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

-- Categorias dos anunciantes
INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
SELECT b.tenant_id, b.id, c.id, true
FROM public.businesses b
JOIN public.categories c ON c.slug = 'alimentos-e-bebidas' AND c.tenant_id IS NULL
WHERE b.id = '00000000-0000-0000-0000-000000000201'
ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
SELECT b.tenant_id, b.id, c.id, true
FROM public.businesses b
JOIN public.categories c ON c.slug = 'servicos' AND c.tenant_id IS NULL
WHERE b.id IN ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000203')
ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
SELECT b.tenant_id, b.id, c.id, true
FROM public.businesses b
JOIN public.categories c ON c.slug = 'imoveis-e-construcao' AND c.tenant_id IS NULL
WHERE b.id = '00000000-0000-0000-0000-000000000204'
ON CONFLICT (business_id, category_id) DO NOTHING;

-- Associação aos proprietários
INSERT INTO public.business_members (tenant_id, business_id, user_id, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103', 'owner', 'active'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'owner', 'active'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'owner', 'active'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000103', 'owner', 'active')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Planos, Versões e Assinaturas Ativas (Subscriptions)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000010';
  v_user_id UUID := '00000000-0000-0000-0000-000000000103';
  v_plan_ouro UUID := '00000000-0000-0000-0000-000000000051';
  v_plan_prata UUID := '00000000-0000-0000-0000-000000000052';
  v_plan_bronze UUID := '00000000-0000-0000-0000-000000000053';
  v_version_ouro UUID := '00000000-0000-0000-0000-000000000061';
  v_version_prata UUID := '00000000-0000-0000-0000-000000000062';
  v_version_bronze UUID := '00000000-0000-0000-0000-000000000063';
BEGIN
  -- Inserir Planos base
  INSERT INTO public.plans (id, tenant_id, code, name, is_active) VALUES
  (v_plan_ouro, v_tenant_id, 'ouro', 'Plano Ouro', true),
  (v_plan_prata, v_tenant_id, 'prata', 'Plano Prata', true),
  (v_plan_bronze, v_tenant_id, 'bronze', 'Plano Bronze', true)
  ON CONFLICT (id) DO NOTHING;

  -- Inserir Versoes
  INSERT INTO public.plan_versions (id, plan_id, version, price_annual, currency, effective_from) VALUES
  (v_version_ouro, v_plan_ouro, 1, 499.00, 'BRL', now()),
  (v_version_prata, v_plan_prata, 1, 299.00, 'BRL', now()),
  (v_version_bronze, v_plan_bronze, 1, 99.00, 'BRL', now())
  ON CONFLICT (id) DO NOTHING;

  -- Inserir Assinaturas para os 4 negócios canônicos se não existirem
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE business_id = '00000000-0000-0000-0000-000000000201') THEN
    INSERT INTO public.subscriptions (tenant_id, business_id, status, plan_version_id, contract_term, payment_schedule, current_period_start, current_period_end)
    VALUES (v_tenant_id, '00000000-0000-0000-0000-000000000201', 'active', v_version_ouro, 'annual', 'installments', now(), now() + interval '10 years');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE business_id = '00000000-0000-0000-0000-000000000202') THEN
    INSERT INTO public.subscriptions (tenant_id, business_id, status, plan_version_id, contract_term, payment_schedule, current_period_start, current_period_end)
    VALUES (v_tenant_id, '00000000-0000-0000-0000-000000000202', 'active', v_version_bronze, 'annual', 'installments', now(), now() + interval '10 years');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE business_id = '00000000-0000-0000-0000-000000000203') THEN
    INSERT INTO public.subscriptions (tenant_id, business_id, status, plan_version_id, contract_term, payment_schedule, current_period_start, current_period_end)
    VALUES (v_tenant_id, '00000000-0000-0000-0000-000000000203', 'active', v_version_prata, 'annual', 'installments', now(), now() + interval '10 years');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE business_id = '00000000-0000-0000-0000-000000000204') THEN
    INSERT INTO public.subscriptions (tenant_id, business_id, status, plan_version_id, contract_term, payment_schedule, current_period_start, current_period_end)
    VALUES (v_tenant_id, '00000000-0000-0000-0000-000000000204', 'active', v_version_ouro, 'annual', 'installments', now(), now() + interval '10 years');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Contatos, Locais e Mídia para Bronze (Saba Advocacia)
-- ---------------------------------------------------------------------------
INSERT INTO public.business_contacts (id, tenant_id, business_id, type, value)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'phone', '(75) 3025-4242'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'whatsapp', '5575999881122'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'email', 'contato@sabaadvocacia.com.br'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'website', 'https://sabaadvocacia.com.br')
ON CONFLICT DO NOTHING;

INSERT INTO public.business_locations (id, tenant_id, business_id, title, street, number, neighborhood, city, state, postal_code, is_headquarters)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000202', 'Sede Principal', 'Av. Getúlio Vargas', '1240', 'Centro', 'Feira de Santana', 'BA', '44001-075', true)
ON CONFLICT DO NOTHING;

UPDATE public.businesses 
SET logo_url = '/visual-lab/assets/bronze-reference'
WHERE id = '00000000-0000-0000-0000-000000000202';

-- ---------------------------------------------------------------------------
-- 9. Lojas Maçônicas de Exemplo (Organizations)
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (id, tenant_id, name, code_number, potency, rite, foundation_date, meeting_schedule, contact_email, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000010', 'Augusta e Respeitável Loja Luz do Sertão', 104, 'GLEB', 'Rito Escocês Antigo e Aceito', '1975-06-15', 'Quinta-feira • 20h', 'contato@luzdosertao.org.br', true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000010', 'Loja Maçônica União e Fraternidade', 42, 'GOB', 'Rito Moderno', '1982-11-20', 'Terça-feira • 20h', 'contato@uniaoefraternidade.org.br', true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000010', 'Loja Maçônica Cavaleiros da Justiça', 88, 'GOB', 'Rito Brasileiro', '1990-03-10', 'Sexta-feira • 19h30', 'contato@cavaleirosdajustica.org.br', true)
ON CONFLICT (id) DO NOTHING;