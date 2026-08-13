-- ============================================================================
-- Product Migration: Conexão Maçônica - Masonic Business Link Policy (6.15)
-- ============================================================================
-- Vínculos comerciais com integridade composta multi-tenant (tenant_id, id) e
-- preservação histórica de auditoria (ON DELETE SET NULL em atores).
-- DDL conceitual promovido a executável na Migration Review (INF-001).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. business_masonic_links
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  declaring_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  link_type TEXT NOT NULL CHECK (link_type IN (
    'owner', 'equity_partner', 'family_owner', 'employee',
    'executive', 'sales_representative', 'authorized_agent', 'institutional_partner'
  )),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_verification', 'under_review', 'correction_requested',
    'approved', 'active', 'rejected', 'suspended', 'expired', 'revoked'
  )),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nota: A chave composta UNIQUE (tenant_id, id) existe exclusivamente para permitir FKs compostas nas tabelas filhas preservando o isolamento multi-tenant.
  CONSTRAINT uq_bml_tenant_id_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_bml_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bml_tenant_business ON public.business_masonic_links(tenant_id, business_id);
-- Garantia de no máximo 1 vínculo principal ativo por empresa por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_bml_primary_per_business ON public.business_masonic_links (tenant_id, business_id) WHERE (is_primary = true AND status = 'active');

CREATE OR REPLACE TRIGGER trg_business_masonic_links_updated_at
  BEFORE UPDATE ON public.business_masonic_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. business_masonic_link_evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'agreement_doc')),
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmle_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmle_link ON public.business_masonic_link_evidence(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 3. business_masonic_link_authorizations (Registro Empresarial Auditável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  authorized_by_name TEXT NOT NULL,
  authorized_by_role TEXT NOT NULL,
  authorization_type TEXT NOT NULL CHECK (authorization_type IN ('owner_declaration', 'corporate_resolution', 'partner_agreement')),
  authorization_scope TEXT NOT NULL CHECK (authorization_scope IN ('company_listing', 'brand_usage', 'member_discount', 'commercial_contact', 'campaign_participation', 'coupon_management')),
  evidence_reference_id UUID REFERENCES public.business_masonic_link_evidence(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  CONSTRAINT fk_bmla_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmla_link ON public.business_masonic_link_authorizations(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 4. business_masonic_link_publication_consents (Consentimento Granular LGPD)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_publication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  visibility_scope TEXT NOT NULL DEFAULT 'authenticated_members' CHECK (visibility_scope IN ('public_all', 'authenticated_members', 'private_admin')),
  display_name BOOLEAN NOT NULL DEFAULT true,
  display_business_role BOOLEAN NOT NULL DEFAULT true,
  display_masonic_role BOOLEAN NOT NULL DEFAULT true,
  display_organization BOOLEAN NOT NULL DEFAULT true,
  display_organization_unit BOOLEAN NOT NULL DEFAULT true,
  display_contact BOOLEAN NOT NULL DEFAULT false,
  display_profile_photo BOOLEAN NOT NULL DEFAULT false,
  display_masonic_degree BOOLEAN NOT NULL DEFAULT false, -- Desabilitado no MVP 1A/1B
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlpc_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlpc_link ON public.business_masonic_link_publication_consents(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 5. business_masonic_link_contests (Entidade Formal de Contestação)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reason_code TEXT NOT NULL CHECK (reason_code IN ('false_claim', 'unauthorized_brand', 'revoked_membership', 'impersonation', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'response_submitted', 'decided', 'appealed', 'closed')),
  response_deadline TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision TEXT CHECK (decision IN ('upheld_link_removed', 'rejected_link_maintained', 'correction_required')),
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  appeal_status TEXT CHECK (appeal_status IN ('none', 'pending', 'decided')),
  appealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlc_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlc_link ON public.business_masonic_link_contests(tenant_id, link_id);

-- ---------------------------------------------------------------------------
-- 6. business_masonic_link_history (Audit Trail Imutável Ampliado)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_masonic_link_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- ex: status_change, primary_toggled, consent_updated, contest_opened
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_fields TEXT[], -- Campos alterados para facilitar diffs e auditorias sem parsing de JSON
  previous_data JSONB,
  new_data JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_reason TEXT,
  correlation_id UUID,
  source TEXT NOT NULL DEFAULT 'user_action',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bmlh_link FOREIGN KEY (tenant_id, link_id) REFERENCES public.business_masonic_links(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bmlh_link ON public.business_masonic_link_history(tenant_id, link_id, created_at);
