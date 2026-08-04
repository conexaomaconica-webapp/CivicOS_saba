-- ============================================================================
-- Product Migration: Conexão Maçônica - Verification & Credentials Context
-- ============================================================================
-- Selos de verificação, evidências, histórico
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. credential_types - Tipos de Selos
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. credential_issuances - Credenciais emitidas
-- FKs explícitas e CHECK de exclusividade em substituição ao polimorfismo
-- ---------------------------------------------------------------------------

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
  -- Restrição de exclusividade estrita do alvo (apenas um dos três)
  CONSTRAINT chk_credential_target_exclusivity CHECK (
    (business_id IS NOT NULL AND user_id IS NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NOT NULL AND organization_id IS NULL) OR
    (business_id IS NULL AND user_id IS NULL AND organization_id IS NOT NULL)
  ),
  CONSTRAINT fk_cred_issuance_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cred_issuance_org FOREIGN KEY (tenant_id, organization_id) REFERENCES public.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_credential_issuances_status ON public.credential_issuances(tenant_id, status);
CREATE INDEX idx_credential_issuances_business ON public.credential_issuances(tenant_id, business_id);
CREATE INDEX idx_credential_issuances_user ON public.credential_issuances(tenant_id, user_id);
CREATE INDEX idx_credential_issuances_org ON public.credential_issuances(tenant_id, organization_id);

CREATE OR REPLACE TRIGGER trg_credential_issuances_updated_at
  BEFORE UPDATE ON public.credential_issuances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. credential_evidence - Evidências/documentos anexados
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('document_pdf', 'image', 'declaration', 'external_link')),
  file_url TEXT NOT NULL,
  file_hash TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credential_evidence_issuance ON public.credential_evidence(issuance_id);

-- ---------------------------------------------------------------------------
-- 4. credential_history - Histórico de mudanças de status
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credential_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_id UUID NOT NULL REFERENCES public.credential_issuances(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credential_history_issuance ON public.credential_history(issuance_id);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_history ENABLE ROW LEVEL SECURITY;

-- credential_types: public read for active tenant; tenant_admin manages
CREATE POLICY "Anyone can view credential_types in tenant"
  ON public.credential_types
  FOR SELECT
  USING (
    (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
  );

CREATE POLICY "tenant_admin can manage credential_types"
  ON public.credential_types
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

-- credential_issuances: 
-- - Public can view verified credentials for published businesses
-- - Requester can view own pending
-- - Verifier (tenant_admin) can manage all
-- - Business members with credential:evidence:upload can upload evidence
CREATE POLICY "Public can view verified credentials"
  ON public.credential_issuances
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND status = 'verified'
    AND (
      (business_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = credential_issuances.business_id
          AND b.tenant_id = credential_issuances.tenant_id
          AND b.publication_status = 'published'
          AND b.is_active = true
      ))
      OR user_id IS NOT NULL
      OR organization_id IS NOT NULL
    )
  );

CREATE POLICY "Requester can view own credential_issuances"
  ON public.credential_issuances
  FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "tenant_admin can manage all credential_issuances"
  ON public.credential_issuances
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

CREATE POLICY "Business members can request credentials"
  ON public.credential_issuances
  FOR INSERT
  WITH CHECK (
    business_id IS NOT NULL
    AND public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    AND requested_by = auth.uid()
  );

CREATE POLICY "Verifier can update credential_issuances"
  ON public.credential_issuances
  FOR UPDATE
  USING (
    public.has_tenant_admin_access(tenant_id)
    AND verified_by != requested_by -- Anti-self-approval enforced by constraint too
  );

-- credential_evidence: requester can upload; verifier can view
CREATE POLICY "Requester can upload evidence"
  ON public.credential_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_evidence.issuance_id
        AND ci.requested_by = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Verifier and requester can view evidence"
  ON public.credential_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_evidence.issuance_id
        AND (ci.requested_by = auth.uid() OR public.has_tenant_admin_access(ci.tenant_id))
    )
  );

-- credential_history: requester and verifier can view
CREATE POLICY "Requester and verifier can view credential_history"
  ON public.credential_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credential_issuances ci
      WHERE ci.id = credential_history.issuance_id
        AND (ci.requested_by = auth.uid() OR public.has_tenant_admin_access(ci.tenant_id))
    )
  );