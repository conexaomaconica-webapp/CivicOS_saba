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

INSERT INTO public.tenants (id, name, slug, settings)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CivicOS Master', 'civicos-master', '{"is_platform_root": true}'),
  ('00000000-0000-0000-0000-000000000010', 'Grande Oriente de SP', 'grande-oriente-sp', '{}'),
  ('00000000-0000-0000-0000-000000000011', 'Loja Luz do Oriente', 'luz-do-oriente', '{}')
ON CONFLICT (id) DO NOTHING;

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
-- 6. Empresa demo publicada
-- ---------------------------------------------------------------------------

INSERT INTO public.businesses (
  id, tenant_id, owner_id, name, description, category,
  logo_url, phone, email, website, address,
  plan_tier, slug, company_type, publication_status, is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000103',
  'Padaria Estrela', 'Padaria artesanal com tradição familiar.', 'alimentos-e-bebidas',
  NULL, '+5511988887777', 'contato@padariaestrela.local', 'https://padariaestrela.local', 'Rua das Flores, 123',
  'ouro', 'padaria-estrela', 'commercial', 'published', true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_categories (tenant_id, business_id, category_id, is_primary)
SELECT
  b.tenant_id, b.id,
  c.id,
  true
FROM public.businesses b
JOIN public.categories c ON c.slug = 'alimentos-e-bebidas' AND c.tenant_id IS NULL
WHERE b.id = '00000000-0000-0000-0000-000000000201'
ON CONFLICT (business_id, category_id) DO NOTHING;

INSERT INTO public.business_members (tenant_id, business_id, user_id, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000103', 'owner', 'active')
ON CONFLICT (business_id, user_id) DO NOTHING;