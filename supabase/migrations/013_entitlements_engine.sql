-- ============================================================================
-- Product Migration: Conexão Maçônica - Entitlements Engine (6.9)
-- ============================================================================
-- Catálogo, origens e consumo: entitlement_definitions, entitlement_sources,
-- entitlement_grants, entitlement_usage, entitlement_overrides.
-- Benefícios concedidos via origens rastreáveis (plan_version, founder_qualification,
-- campaign, manual_override) com valores tipados e status.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. entitlement_definitions - Catálogo de direitos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric', 'unlimited')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. entitlement_sources - Origem de cada concessão de direito
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('plan_version', 'founder_qualification', 'campaign', 'manual_override')),
  source_reference_id UUID NOT NULL, -- ID da versão do plano, da qualificação de fundador, etc.
  source_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_sources_tenant ON public.entitlement_sources(tenant_id, source_type);

-- ---------------------------------------------------------------------------
-- 3. entitlement_grants - Concessões com colunas tipadas e status
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_entitlement_grants_business ON public.entitlement_grants(business_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_grants_entitlement ON public.entitlement_grants(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_grants_status ON public.entitlement_grants(tenant_id, status);

-- ---------------------------------------------------------------------------
-- 4. entitlement_usage & entitlement_overrides - Consumo e sobreposição
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_grant ON public.entitlement_overrides(grant_id);
