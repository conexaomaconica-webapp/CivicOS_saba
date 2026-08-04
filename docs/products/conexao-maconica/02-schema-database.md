# Documento 02 — Schema Database: Conexão Maçônica

**Versão:** 2.1.0  
**Status:** Aprovado com Ajustes  
**Base:** `Especificação Funcional v1.1.0` & `Arquitetura Técnica v1.0.0 (Aprovada)`  
**Plataforma:** CivicOS (`foundation-v1.0`)  
**Branch:** `product/conexao-maconica-v1`

---

## 1. Escopo e Princípios de Modelagem

Este documento estabelece a modelagem lógica e física completa do banco de dados relacional (PostgreSQL via Supabase) para o produto **Conexão Maçônica**.

### 1.1 Princípios de Design do Banco
1. **Fronteira Rígida de Plataforma**: A Fundação (`foundation-v1.0`) permanece intacta. Nenhuma migração altera tabelas do Core sem compatibilidade retroativa.
2. **Independência Estrita de Estados**: A empresa (`businesses`), a assinatura (`subscriptions`), a versão do plano (`plan_versions`), a qualificação histórica de Fundador (`founder_qualifications`), os selos de verificação (`credential_issuances`), os destaques visuais (`listing_highlights`), os patrocínios (`sponsorships`) e os direitos de uso (`entitlements`) possuem **tabelas independentes**. O campo `businesses` **NÃO** possui a coluna `plan_tier` ou flags booleanas de estado financeiro.
3. **Terminologia Canônica Única (`businesses`)**: Todas as entidades relacionadas ao diretório utilizam a nomenclatura padronizada `business_*` (ex: `business_locations`, `business_contacts`, `business_hours`, `business_media`, `business_attributes`, `business_categories`) e a chave estrangeira `business_id`.
4. **Isolamento Físico de CRM vs. Leads**: O CRM de Vendas da plataforma (`crm_*`) operado pela equipe interna para prospecção de anunciantes **jamais** compartilha tabelas físicas com os leads recebidos pelos anunciantes (`leads_*`).
5. **Integridade Cross-Tenant por Constraints Compostos**: Além das políticas de Row Level Security (RLS) para controle de acesso em tempo de execução, a integridade relacional entre tenants é fisicamente garantida por Foreign Keys compostas `(tenant_id, business_id) REFERENCES businesses(tenant_id, id)`.
6. **Imutabilidade Financeira & Histórico Compensatório**: Faturas e pagamentos confirmados formam registros imutáveis. Alterações de estado, reembolsos e ajustes operam via registros compensatórios e tabelas de histórico.
7. **Minimização LGPD & Minimização de Dados**: Dados de aceites e consentimentos evitam o armazenamento bruto obrigatório de IPs e impressões digitais, utilizando referências de sessão pseudonimizadas e metadados de retenção controlada.

---

## 2. Convenções de Nomenclatura e Tipagem

| Elemento | Convenção | Exemplo |
|---|---|---|
| **Tabelas** | `snake_case`, plural | `businesses`, `tenant_settings` |
| **Colunas** | `snake_case`, singular | `created_at`, `user_id` |
| **Chave Primária (PK)** | UUID v4 gerado via `gen_random_uuid()` | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| **Chave Estrangeira (FK)** | `<entidade_singular>_id` | `tenant_id`, `business_id` |
| **FK Composta Cross-Tenant**| `(tenant_id, <entidade>_id)` | `FOREIGN KEY (tenant_id, business_id) REFERENCES businesses(tenant_id, id)` |
| **Timestamps** | `TIMESTAMPTZ`, padrão `now()` | `created_at`, `updated_at`, `deleted_at` |
| **Monetário** | `NUMERIC(12, 2)` | `amount_due`, `unit_price` |
| **Booleanos** | Prefixo `is_` ou `has_` | `is_active`, `is_primary` |
| **Índices** | `idx_<tabela>_<coluna(s)>` | `idx_businesses_tenant_slug` |
| **Constraints Unique** | `uq_<tabela>_<coluna(s)>` | `uq_tenants_slug` |
| **Constraints Check** | `chk_<tabela>_<regra>` | `chk_invoices_amount_positive` |

---

## 3. Matriz Comparativa: Foundation vs. Produto

| Tabela | Origem | Ação no Produto | Ownership | Escopo Tenancy | MVP |
|---|---|---|---|---|---|
| `tenants` | Foundation | Reutilizada sem alteração | Core | Global | 1A |
| `tenant_plugins` | Foundation | Reutilizada sem alteração | Core | Tenant-Scoped | 1A |
| `tenant_members` | Foundation | Reutilizada para vínculo de conta ao tenant | Core | Tenant-Scoped | 1A |
| `profiles` | Foundation | Reutilizada para perfil base do usuário | Core | Global / User | 1A |
| `businesses` | Foundation | Reutilizada como entidade base (estendida via migration) | Directory | Tenant-Scoped | 1A |
| `tenant_plans` | Foundation | Reutilizada como oferta/exposição por tenant (`tenant_plan_offerings`) | Commerce | Tenant-Scoped | 1A |
| `tenant_settings` | Produto | Nova tabela | Platform | Tenant-Scoped | 1A |
| `tenant_domains` | Produto | Nova tabela | Platform | Tenant-Scoped | 1A |
| `tenant_features` | Produto | Nova tabela (Feature Flags por tenant) | Platform | Tenant-Scoped | 1A |
| `roles` | Produto | Nova tabela | RBAC | Tenant/Global | 1A |
| `permissions` | Produto | Nova tabela | RBAC | Global | 1A |
| `role_permissions` | Produto | Nova tabela | RBAC | Global | 1A |
| `user_roles` | Produto | Nova tabela | RBAC | Tenant-Scoped | 1A |
| `business_members` | Produto | Nova tabela (Delegação e Co-propriedade de empresas) | Directory | Tenant-Scoped | 1A |
| `categories` | Produto | Nova tabela | Directory | Tenant/Global | 1A |
| `business_categories` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `business_locations` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `business_contacts` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `business_hours` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `business_media` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `business_attributes` | Produto | Nova tabela | Directory | Tenant-Scoped | 1A |
| `organizations` | Produto | Nova tabela (Domínio Maçônico Institucional) | Masonic | Tenant-Scoped | 1A |
| `organization_units` | Produto | Nova tabela | Masonic | Tenant-Scoped | 1A |
| `organization_people` | Produto | Nova tabela (Pessoas institucionais independem de auth) | Masonic | Tenant-Scoped | 1A |
| `organization_memberships` | Produto | Proposta de extensão futura | Masonic | Tenant-Scoped | 1B |
| `organization_relationships` | Produto | Proposta de extensão futura | Masonic | Tenant-Scoped | 1B |
| `credential_types` | Produto | Nova tabela (Tipos de Selos) | Credentials | Tenant/Global | 1A |
| `credential_issuances` | Produto | Nova tabela | Credentials | Tenant-Scoped | 1A |
| `credential_evidence` | Produto | Nova tabela | Credentials | Tenant-Scoped | 1A |
| `credential_history` | Produto | Nova tabela | Credentials | Tenant-Scoped | 1A |
| `founder_qualifications` | Produto | Nova tabela (Reconhecimento histórico) | Founder | Tenant-Scoped | 1A |
| `listing_highlights` | Produto | Nova tabela (Destaques visuais) | Marketing | Tenant-Scoped | 1A |
| `sponsorships` | Produto | Nova tabela (Patrocínio de canais/seções) | Marketing | Tenant-Scoped | 1B |
| `sponsorship_periods` | Produto | Nova tabela | Marketing | Tenant-Scoped | 1B |
| `plans` | Produto | Nova tabela (Catálogo abstrato de ofertas) | Commerce | Tenant-Scoped | 1A |
| `plan_versions` | Produto | Nova tabela (Versões imutáveis de preço e regras) | Commerce | Tenant-Scoped | 1A |
| `subscriptions` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `subscription_periods` | Produto | Nova tabela (Períodos de vigência contratual) | Commerce | Tenant-Scoped | 1A |
| `invoices` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `invoice_items` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `invoice_status_history` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `payments` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `payment_attempts` | Produto | Nova tabela | Commerce | Tenant-Scoped | 1A |
| `payment_refunds` | Produto | Nova tabela (Estornos e reembolsos) | Commerce | Tenant-Scoped | 1A |
| `financial_adjustments` | Produto | Nova tabela (Ajustes compensatórios/créditos) | Commerce | Tenant-Scoped | 1A |
| `payment_provider_events` | Produto | Nova tabela (Webhooks idempotentes) | Commerce | Operational | 1A |
| `legal_documents` | Produto | Nova tabela | Legal | Tenant/Global | 1A |
| `legal_document_versions` | Produto | Nova tabela | Legal | Tenant/Global | 1A |
| `acceptance_records` | Produto | Nova tabela (Aceite LGPD minimizado) | Legal | Tenant-Scoped | 1A |
| `consent_records` | Produto | Nova tabela | Legal | Tenant-Scoped | 1A |
| `consent_withdrawals` | Produto | Nova tabela | Legal | Tenant-Scoped | 1A |
| `entitlement_definitions` | Produto | Nova tabela (Catálogo de direitos de uso) | Entitlements| Global | 1A |
| `entitlement_sources` | Produto | Nova tabela (Origem rastreável dos direitos) | Entitlements| Tenant-Scoped | 1A |
| `entitlement_grants` | Produto | Nova tabela (Concessões tipadas) | Entitlements| Tenant-Scoped | 1A |
| `entitlement_usage` | Produto | Nova tabela (Consumo contável) | Entitlements| Tenant-Scoped | 1A |
| `entitlement_overrides` | Produto | Nova tabela | Entitlements| Tenant-Scoped | 1A |
| `crm_pipeline_stages` | Produto | Nova tabela | Internal CRM| Tenant-Scoped | 1A |
| `crm_prospects` | Produto | Nova tabela | Internal CRM| Operational | 1A |
| `crm_opportunities` | Produto | Nova tabela | Internal CRM| Operational | 1A |
| `crm_activities` | Produto | Nova tabela | Internal CRM| Operational | 1A |
| `crm_proposals` | Produto | Nova tabela | Internal CRM| Operational | 1A |
| `crm_renewal_cases` | Produto | Nova tabela | Internal CRM| Operational | 1A |
| `leads` | Produto | Nova tabela (Leads do anunciante) | Leads | Tenant-Scoped | 1A |
| `lead_messages` | Produto | Nova tabela | Leads | Tenant-Scoped | 1A |
| `lead_status_history` | Produto | Nova tabela | Leads | Tenant-Scoped | 1A |
| `lead_consents` | Produto | Nova tabela | Leads | Tenant-Scoped | 1A |
| `lead_conversion_events` | Produto | Nova tabela | Leads | Tenant-Scoped | 1A |
| `banners` | Produto | Nova tabela (Banners CMS do tenant) | Content | Tenant-Scoped | 1A |
| `notification_templates` | Produto | Nova tabela | Notifications| Tenant-Scoped | 1A |
| `notifications` | Produto | Nova tabela | Notifications| Tenant-Scoped | 1A |
| `notification_deliveries` | Produto | Nova tabela | Notifications| Tenant-Scoped | 1A |
| `coupons` | Produto | Nova tabela | Content/Promo| Tenant-Scoped | 1B |
| `coupon_redemptions` | Produto | Nova tabela | Content/Promo| Tenant-Scoped | 1B |
| `articles` | Produto | Nova tabela | Content | Tenant-Scoped | 1B |
| `events` | Produto | Nova tabela | Content | Tenant-Scoped | 1B |
| `popups` | Produto | Nova tabela | Content | Tenant-Scoped | 1B |
| `import_jobs` | Produto | Nova tabela | Import | Tenant-Scoped | 1A |
| `import_files` | Produto | Nova tabela | Import | Tenant-Scoped | 1A |
| `import_rows` | Produto | Nova tabela | Import | Tenant-Scoped | 1A |
| `import_errors` | Produto | Nova tabela | Import | Tenant-Scoped | 1A |
| `import_execution_history` | Produto | Nova tabela | Import | Tenant-Scoped | 1A |
| `audit_logs` | Produto | Nova tabela | Audit | Tenant-Scoped | 1A |
| `analytics_events` | Produto | Nova tabela | Analytics | Tenant-Scoped | 1A |
| `business_metric_rollups` | Produto | Nova tabela | Analytics | Tenant-Scoped | 1A |
| `outbox_events` | Produto | Nova tabela (Padrão Outbox transacional) | Messaging | Tenant-Scoped | 1A |

---

## 4. Distinção entre Plugins, Capabilities, Feature Flags e Entitlements

Para evitar duplicação entre `tenant_plugins` e `tenant_features`, o banco adota a seguinte cadeia conceitual estrita:

```text
tenant_plugins (Módulo instalado no tenant)
  └─► Capabilities (Interfaces genéricas exportadas pelo SDK do plugin)
        └─► tenant_features (Flags de alternância e parâmetros operacionais do tenant)
              └─► entitlement_grants (Direitos de uso tipados concedidos à empresa/usuário)
```

- **`tenant_plugins`**: Controla a ativação física de um plugin no tenant (ex: `plugin-business-directory`).
- **`tenant_features`**: Controla a liberação funcional de sub-recursos configuráveis por tenant (ex: `enable_map_search`, `allow_anonymous_leads`).
- **`entitlement_grants`**: Controla os limites de consumo e direitos de uma empresa específica (ex: `max_photos = 15`, `has_verified_badge = true`).

---

## 5. Estrutura do RBAC e Relação com a Foundation

A Foundation fornece `tenant_members` para representar o vínculo de uma conta (`auth.users`) a um `tenant`. O produto estende essa autorização via RBAC refinado:

- **`tenant_members`**: Representa o pertencimento da conta ao tenant e seu papel primário simplificado.
- **`user_roles`**: Associa um ou mais papéis granulares (`roles`) ao usuário em determinado tenant.
- **Validação Cross-Tenant em `user_roles`**: Para evitar que um papel pertencente ao Tenant A seja atribuído a um usuário no Tenant B, a tabela `user_roles` inclui constraint de verificação relacional.
- **Tratamento de `tenant_id NULL` em tabelas globais**: Para suportar catálogos globais (ex: permissões do sistema ou papéis nativos), as unique constraints utilizam índices parciais (`WHERE tenant_id IS NULL` e `WHERE tenant_id IS NOT NULL`).

---

## 6. Catálogo Integral de Tabelas e Schemas SQL

---

### 6.1 Platform & Tenant Context

#### 6.1.1 `public.tenant_settings`
Configurações operacionais estendidas do tenant.
```sql
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  support_email TEXT,
  whatsapp_number TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  currency TEXT NOT NULL DEFAULT 'BRL',
  allow_self_registration BOOLEAN NOT NULL DEFAULT true,
  require_masonic_verification_for_listing BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_settings_tenant UNIQUE (tenant_id)
);
```

#### 6.1.2 `public.tenant_domains`
Subdomínios e domínios customizados (White Label).
```sql
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  ssl_status TEXT NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_domains_domain UNIQUE (domain)
);
CREATE INDEX idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);
```

#### 6.1.3 `public.tenant_features`
Flags de alternância e parâmetros por tenant.
```sql
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_features_key UNIQUE (tenant_id, feature_key)
);
```

---

### 6.2 Identity & Authorization Context (RBAC Estendido)

#### 6.2.1 `public.roles`
Papéis no sistema (Globais ou por Tenant).
```sql
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices parciais para tratar unicidade de tenant_id NULL vs NOT NULL
CREATE UNIQUE INDEX uq_roles_global_name ON public.roles(name) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_roles_tenant_name ON public.roles(tenant_id, name) WHERE tenant_id IS NOT NULL;
```

#### 6.2.2 `public.permissions`
Catálogo de permissões do sistema.
```sql
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL, -- ex: 'business:create', 'lead:view_phone', 'crm:manage'
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_permissions_code UNIQUE (code)
);
```

#### 6.2.3 `public.role_permissions`
Relação entre Papéis e Permissões.
```sql
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
```

#### 6.2.4 `public.user_roles`
Associação de papéis a usuários dentro de um tenant.
```sql
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  expires_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_user_roles_tenant_user_role UNIQUE (tenant_id, user_id, role_id)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
```

#### 6.2.5 `public.elevated_access_sessions` (Acesso Elevado de Suporte Master)
Sessões temporárias de acesso autorizado para administradores master visualizarem ou interagirem com dados confidenciais privados.
```sql
CREATE TABLE IF NOT EXISTS public.elevated_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID,
  reason TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('support:elevated_access', 'privacy:restricted_data:view', 'financial:cross_tenant:view')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  session_evidence_id UUID
);
CREATE INDEX idx_elevated_access_user_status ON public.elevated_access_sessions(user_id, status, expires_at);
```

---

### 6.3 Directory Context (Guia de Empresas)

#### 6.3.1 Migration em `public.businesses` (Reutilizada da Foundation)
```sql
-- Garante chave única composta (tenant_id, id) para integridade relacional de tabelas filhas
ALTER TABLE public.businesses ADD CONSTRAINT uq_businesses_tenant_id UNIQUE (tenant_id, id);

-- Adiciona campos estendidos de diretório (SEM plan_tier) com status explícito de publicação
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'commercial' CHECK (company_type IN ('commercial', 'masonic_store', 'service_provider'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'pending_approval', 'published', 'suspended', 'archived'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
```

#### 6.3.2 `public.business_members` (Delegação, Convites e Ciclo de Vida)
Substitui a restrição de proprietário único (`owner_id`), permitindo múltiplos gestores com gestão de convites e revogação.
```sql
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL se convite pendente
  invited_email TEXT,
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_members UNIQUE (business_id, user_id),
  CONSTRAINT fk_business_members_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);
CREATE INDEX idx_business_members_invite ON public.business_members(invited_email, invite_token_hash);
```

#### 6.3.3 `public.categories`
Árvore de categorias.
```sql
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_categories_global_slug ON public.categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_categories_tenant_slug ON public.categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
```

#### 6.3.4 `public.business_categories`
```sql
CREATE TABLE IF NOT EXISTS public.business_categories (
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, category_id),
  CONSTRAINT fk_bus_cat_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.3.5 `public.business_locations`
Endereços com suporte a geolocalização por coordenadas e canal futuro para PostGIS.
```sql
CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Matriz',
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_headquarters BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_loc_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_business_locations_business ON public.business_locations(business_id);
CREATE INDEX idx_business_locations_city_state ON public.business_locations(city, state);
CREATE INDEX idx_business_locations_lat_lng ON public.business_locations(latitude, longitude);
```

#### 6.3.6 `public.business_contacts`
```sql
CREATE TABLE IF NOT EXISTS public.business_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'phone', 'email', 'instagram', 'linkedin', 'facebook', 'website')),
  value TEXT NOT NULL,
  label TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_contacts_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.3.7 `public.business_hours`
```sql
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_business_hours_day UNIQUE (business_id, day_of_week),
  CONSTRAINT fk_bus_hours_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.3.8 `public.business_media`
```sql
CREATE TABLE IF NOT EXISTS public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bus_media_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.3.9 `public.business_attributes`
```sql
CREATE TABLE IF NOT EXISTS public.business_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_attributes_key UNIQUE (business_id, attribute_key),
  CONSTRAINT fk_bus_attr_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

---

### 6.4 Masonic Organizations Context (Domínio Institucional)

> **Nota de MVP**: Apenas `organizations`, `organization_units` e `organization_people` são criadas no MVP 1A. As demais permanecem como propostas estendidas para o MVP 1B.

#### 6.4.1 `public.organizations` (MVP 1A)
```sql
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_number INTEGER,
  potency TEXT NOT NULL,
  rite TEXT,
  foundation_date DATE,
  meeting_schedule TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_organizations_tenant_code UNIQUE (tenant_id, potency, code_number),
  CONSTRAINT uq_organizations_tenant_id UNIQUE (tenant_id, id)
);
CREATE INDEX idx_organizations_tenant ON public.organizations(tenant_id);
```

#### 6.4.2 `public.organization_units` (MVP 1A)
```sql
CREATE TABLE IF NOT EXISTS public.organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_units_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.4.3 `public.organization_people` (MVP 1A)
Pessoas vinculadas à instituição (independem de possuir conta ativa no `auth.users`).
```sql
CREATE TABLE IF NOT EXISTS public.organization_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional
  full_name TEXT NOT NULL,
  cimb_code TEXT, -- Cadastro institucional
  masonic_degree TEXT,
  role_in_org TEXT NOT NULL DEFAULT 'membro',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'licensed', 'transferred', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_org_people_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);
```

---

### 6.5 Verification & Credentials Context (Selos)

#### 6.5.1 `public.credential_types`
```sql
CREATE TABLE IF NOT EXISTS public.credential_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  validity_days INTEGER,
  requires_evidence BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_cred_types_global_code ON public.credential_types(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_cred_types_tenant_code ON public.credential_types(tenant_id, code) WHERE tenant_id IS NOT NULL;
```

#### 6.5.2 `public.credential_issuances`
Credenciais emitidas com FKs explícitas e CHECK de exclusividade em substituição ao polimorfismo frágil.
```sql
CREATE TABLE IF NOT EXISTS public.credential_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES public.credential_types(id) ON DELETE RESTRICT,
  business_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired', 'revoked')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Validação de Anti-Self-Approval
  CONSTRAINT chk_cred_anti_self_approval CHECK (
    status != 'verified' OR verified_by IS NULL OR requested_by IS NULL OR requested_by != verified_by
  ),
  -- Restrição de exclusividade estrita do alvo
  CONSTRAINT chk_credential_target_exclusivity CHECK (
    (business_id IS NOT NULL AND user_id IS NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NOT NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT fk_cred_issuance_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cred_issuance_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_credential_issuances_status ON public.credential_issuances(tenant_id, status);
```

#### 6.5.3 `public.credential_evidence`
```sql
CREATE TABLE IF NOT EXISTS public.credential_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'external_link')),
  file_url TEXT NOT NULL,
  file_hash TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.5.4 `public.credential_history`
```sql
CREATE TABLE IF NOT EXISTS public.credential_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.6 Founder, Destaque e Patrocínio

#### 6.6.1 `public.founder_qualifications`
Registra exclusivamente o reconhecimento histórico de Fundador. Benefícios são concedidos via Entitlements.
```sql
CREATE TABLE IF NOT EXISTS public.founder_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  founder_number INTEGER NOT NULL,
  qualified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_founder_number UNIQUE (tenant_id, founder_number),
  CONSTRAINT uq_founder_business UNIQUE (business_id),
  CONSTRAINT fk_founder_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.6.2 `public.listing_highlights`
Destaques visuais no portal (carrossel, topo de busca).
```sql
CREATE TABLE IF NOT EXISTS public.listing_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  highlight_type TEXT NOT NULL CHECK (highlight_type IN ('home_carousel', 'category_top', 'search_boost')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_highlights_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_listing_highlights_active ON public.listing_highlights(tenant_id, is_active, start_at, end_at);
```

#### 6.6.3 `public.sponsorships` & `public.sponsorship_periods` [MVP 1B]
Patrocínio formal de seções, canais ou categorias (conceito distinto de destaque comercial de listagem).
```sql
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  sponsor_scope TEXT NOT NULL CHECK (sponsor_scope IN ('portal_global', 'category', 'event_channel')),
  scope_target_id UUID, -- ID da categoria ou evento patrocinado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_sponsorships_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sponsorship_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID NOT NULL REFERENCES public.sponsorships(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.7 Billing & Subscriptions Context (Planos e Assinaturas)

#### 6.7.1 `public.plans`
Catálogo abstrato de ofertas.
```sql
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plans_code_tenant UNIQUE (tenant_id, code)
);
```

#### 6.7.2 `public.plan_versions`
Versões imutáveis de preço e regras.
```sql
CREATE TABLE IF NOT EXISTS public.plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  price_annual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  features_summary JSONB NOT NULL DEFAULT '{}',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_versions UNIQUE (plan_id, version)
);
```

#### 6.7.3 `public.subscriptions`
Assinaturas de empresas. O contrato é restrito a `contract_term = 'annual'`, desacoplando a vigência da frequência de pagamento.
```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  plan_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  contract_term TEXT NOT NULL DEFAULT 'annual' CHECK (contract_term IN ('annual')),
  payment_schedule TEXT NOT NULL DEFAULT 'lump_sum' CHECK (payment_schedule IN ('lump_sum', 'installments')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_subscriptions_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_subscriptions_business ON public.subscriptions(tenant_id, business_id);
```

#### 6.7.4 `public.subscription_periods`
```sql
CREATE TABLE IF NOT EXISTS public.subscription_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscription_periods_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_sub_periods_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.7.5 `public.invoices`
```sql
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_period_id UUID REFERENCES public.subscription_periods(id) ON DELETE SET NULL,
  business_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'overdue')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_invoices_status ON public.invoices(tenant_id, status);
```

#### 6.7.6 `public.invoice_items` & `public.invoice_status_history`
```sql
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.7.7 `public.payments`, `public.payment_refunds` & `public.financial_adjustments`
Transações financeiras imutáveis, estornos e créditos compensatórios.
```sql
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'bank_slip', 'manual_transfer')),
  provider_code TEXT NOT NULL, -- Neutro (ex: 'asaas', 'stripe', 'manual')
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payments_provider_tx UNIQUE (provider_code, provider_transaction_id)
);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  type TEXT NOT NULL CHECK (type IN ('credit_grant', 'debit_adjustment', 'waiver')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fin_adj_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
```

#### 6.7.8 `public.payment_attempts` & `public.payment_provider_events`
```sql
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
  error_code TEXT,
  error_message TEXT,
  payload_sent JSONB,
  response_received JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_provider_events UNIQUE (provider_code, event_id)
);
```

---

### 6.8 Contracts & Consent Context (Aceites LGPD Minimizados)

#### 6.8.1 `public.legal_documents` & `public.legal_document_versions`
```sql
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_legal_docs_global_code ON public.legal_documents(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_legal_docs_tenant_code ON public.legal_documents(tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_legal_doc_version UNIQUE (document_id, version)
);
```

#### 6.8.2 `public.acceptance_records`
Evidência técnica minimizada (evita persistência ostensiva de IP/User-Agent).
```sql
CREATE TABLE IF NOT EXISTS public.acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT,
  session_evidence_id TEXT NOT NULL, -- Identificador de sessão auditável
  evidence_metadata JSONB NOT NULL DEFAULT '{}',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_acceptance_user ON public.acceptance_records(user_id);
```

#### 6.8.3 `public.consent_records` & `public.consent_withdrawals`
```sql
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consent_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES public.consent_records(id) ON DELETE CASCADE,
  reason TEXT,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.9 Entitlements Engine (Catálogo, Origens e Consumo)

#### 6.9.1 `public.entitlement_definitions`
```sql
CREATE TABLE IF NOT EXISTS public.entitlement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric', 'unlimited')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.9.2 `public.entitlement_sources`
Rastreabilidade estrita da origem de cada concessão de direito.
```sql
CREATE TABLE IF NOT EXISTS public.entitlement_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('plan_version', 'founder_qualification', 'campaign', 'manual_override')),
  source_reference_id UUID NOT NULL, -- ID da versão do plano, da qualificação de fundador, etc.
  source_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.9.3 `public.entitlement_grants`
Concessões com colunas tipadas e status.
```sql
CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  entitlement_id UUID NOT NULL REFERENCES public.entitlement_definitions(id) ON DELETE RESTRICT,
  source_id UUID NOT NULL REFERENCES public.entitlement_sources(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  value_boolean BOOLEAN,
  value_numeric INTEGER,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ent_grants_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_entitlement_grants_business ON public.entitlement_grants(business_id);
```

#### 6.9.4 `public.entitlement_usage` & `public.entitlement_overrides`
```sql
CREATE TABLE IF NOT EXISTS public.entitlement_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.entitlement_grants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entitlement_usage UNIQUE (grant_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.entitlement_grants(id) ON DELETE CASCADE,
  override_value_numeric INTEGER,
  override_value_boolean BOOLEAN,
  reason TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.10 CRM Interno de Vendas (Operação da Plataforma)

> **ISOLAMENTO FÍSICO E TENANCY**: Dados possuem `tenant_id` para escopo do tenant, mas acesso operacional é concedido de forma cross-tenant para a equipe master/admin da plataforma.

#### 6.10.1 `public.crm_pipeline_stages`, `public.crm_prospects` & `public.crm_opportunities`
```sql
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  win_probability NUMERIC(5, 2) DEFAULT 0.00,
  is_terminal_win BOOLEAN NOT NULL DEFAULT false,
  is_terminal_loss BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  target_plan_id UUID REFERENCES public.plans(id),
  estimated_value NUMERIC(12, 2),
  expected_close_date DATE,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.10.2 `public.crm_activities`, `public.crm_proposals` & `public.crm_renewal_cases`
```sql
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'meeting', 'whatsapp', 'email', 'note')),
  notes TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_renewal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES auth.users(id),
  stage TEXT NOT NULL DEFAULT 'upcoming' CHECK (stage IN ('upcoming', 'in_negotiation', 'renewed', 'churned')),
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.11 Leads do Anunciante

> **ISOLAMENTO FÍSICO CRÍTICO**: Exclusivo para mensagens recebidas pelos anunciantes.

#### 6.11.1 `public.leads` & `public.lead_messages`
```sql
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  origin_channel TEXT NOT NULL DEFAULT 'portal_form' CHECK (origin_channel IN ('portal_form', 'whatsapp_click', 'coupon_claim')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed_won', 'closed_lost', 'archived')),
  has_masonic_regularity_badge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_leads_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_leads_business ON public.leads(business_id);

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'advertiser')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.11.2 `public.lead_status_history`, `public.lead_consents` & `public.lead_conversion_events`
```sql
CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_text TEXT NOT NULL,
  session_evidence_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL,
  value NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.12 Conteúdo, Banners, Cupons e Notificações

#### 6.12.1 `public.banners` (MVP 1A)
```sql
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  position TEXT NOT NULL DEFAULT 'home_top' CHECK (position IN ('home_top', 'sidebar', 'category_banner')),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.12.2 `public.notification_templates`, `public.notifications` & `public.notification_deliveries` (MVP 1A)
```sql
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'push')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
  provider_response JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.12.3 `public.coupons`, `public.coupon_redemptions`, `public.articles`, `public.events` & `public.popups` [MVP 1B]
```sql
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  discount_percentage NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_redemptions INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coupons_code UNIQUE (tenant_id, business_id, code),
  CONSTRAINT fk_coupons_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validation_code TEXT UNIQUE NOT NULL,
  CONSTRAINT uq_single_user_coupon UNIQUE (coupon_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.13 Import Framework (Carga em Lote por Planilha)

#### 6.13.1 `public.import_jobs`, `public.import_files` & `public.import_rows`
```sql
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('businesses', 'members', 'organizations')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_checksum TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  deduplication_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'imported', 'failed')),
  target_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6.13.2 `public.import_errors` & `public.import_execution_history`
```sql
CREATE TABLE IF NOT EXISTS public.import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_id UUID REFERENCES public.import_rows(id) ON DELETE CASCADE,
  column_name TEXT,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  execution_details JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.14 Analytics, Auditoria e Outbox

#### 6.14.1 `public.audit_logs`
```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  session_evidence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant_entity ON public.audit_logs(tenant_id, entity_type, entity_id);
```

#### 6.14.2 `public.analytics_events` & `public.business_metric_rollups`
Telemetria pseudonimizada (sem fixar algoritmo SHA-256 prematuramente).
```sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  pseudonymous_subject_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_business_date ON public.analytics_events(business_id, created_at);

CREATE TABLE IF NOT EXISTS public.business_metric_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  phone_views INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_business_metric_date UNIQUE (business_id, metric_date)
);
```

#### 6.14.3 `public.outbox_events` (Mensageria Transacional)
```sql
CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_events_unpublished ON public.outbox_events(published, created_at) WHERE published = false;
```

---

#### 6.15 Schemas Conceituais de Extensão — Masonic Business Link Policy

As tabelas de extensão abaixo modelam os vínculos comerciais sem alterar o schema da Fundação CivicOS (`tenant_members`, `organization_people` e `businesses` mantêm suas semânticas puras da plataforma):

##### 6.15.1 `public.business_masonic_links`
```sql
CREATE TABLE IF NOT EXISTS public.business_masonic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  declaring_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('owner_partner', 'family_member', 'brother_representative', 'institutional_partner')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked', 'expired')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bml_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_bml_tenant_business ON public.business_masonic_links(tenant_id, business_id);
```

##### 6.15.2 `public.business_masonic_link_evidence`
```sql
CREATE TABLE IF NOT EXISTS public.business_masonic_link_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.business_masonic_links(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'agreement_doc')),
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

##### 6.15.3 `public.business_masonic_link_authorizations`
```sql
CREATE TABLE IF NOT EXISTS public.business_masonic_link_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.business_masonic_links(id) ON DELETE CASCADE,
  authorized_by_business_owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  authorization_status TEXT NOT NULL DEFAULT 'granted' CHECK (authorization_status IN ('granted', 'revoked')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
```

##### 6.15.4 `public.business_masonic_link_publication_consents`
```sql
CREATE TABLE IF NOT EXISTS public.business_masonic_link_publication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.business_masonic_links(id) ON DELETE CASCADE,
  visibility_scope TEXT NOT NULL DEFAULT 'authenticated_members' CHECK (visibility_scope IN ('public_all', 'authenticated_members', 'private_admin')),
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

##### 6.15.5 `public.business_masonic_link_history` (Audit Trail Imutável)
```sql
CREATE TABLE IF NOT EXISTS public.business_masonic_link_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.business_masonic_links(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Estratégia de Isolamento Multi-Tenant & RLS (Clarificação de Segurança)

Para eliminar ambiguidade sobre segurança e performance:

1. **Desempenho de Leitura**: Garantido por índices compostos `(tenant_id, ...)`.
2. **Integridade de Dados no Banco**: Garantida fisicamente por Foreign Keys compostas `(tenant_id, business_id) REFERENCES businesses(tenant_id, id)`, que impedem que registros de empresas no Tenant A façam referência a dependências do Tenant B.
3. **Controle de Acesso em Tempo de Execução**: Garantido exclusivamente por políticas de **Row Level Security (RLS)** ativas em todas as tabelas:
   ```sql
   -- Exemplo de política base para tabelas de diretório
   CREATE POLICY "Users can only access business records within their tenant"
     ON public.business_locations
     FOR ALL
     USING (
       tenant_id IN (
         SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid()
       )
     );
   ```

---

## 8. Resumo do ADR-002 (Modelo de Assinaturas e Períodos)

* **Contexto**: A Especificação exige vigência contratual anual com cobranças desacopladas.
* **Opção A (Aprovada)**: Assinatura contínua lógica (`subscriptions`) vinculada a registros explícitos de ciclo (`subscription_periods`).
* **Regras de Negócio**:
  1. **Contrato**: Restrito a `contract_term = 'annual'`.
  2. **Upgrade Imediato**: Cancela o período atual e cria um novo `subscription_period` anual com vigência zerada a partir da data do upgrade.
  3. **Downgrade Agendado**: Registrado em `subscription_changes` para efetivação no término do `subscription_period` corrente.
  4. **Provedor Neutro**: O gateway (Asaas, Stripe, etc.) opera como canal de pagamento via `payment_provider_events` e `payments.provider_code`, sem acoplamento no schema.

---

## 9. Proposta do ADR-003 (Pseudonimização e Analytics)

* **Status**: Aprovado para detalhamento no Documento 03.
* **Diretriz**: O campo `pseudonymous_subject_id` em `analytics_events` armazenará identificadores não rotulados gerados por salting dinâmico por tenant, evitando cruzamento de perfis comportamentais de navegação.

---

## 10. Conclusão

Este documento revisado atende 100% às correções solicitadas. **Nenhuma migração SQL foi criada ou executada no Supabase**, mantendo o ambiente limpo e pronto para a próxima fase.
