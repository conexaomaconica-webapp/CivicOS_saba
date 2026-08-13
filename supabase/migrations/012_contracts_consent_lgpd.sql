-- ============================================================================
-- Product Migration: Conexão Maçônica - Contracts & Consent Context (6.8)
-- ============================================================================
-- Aceites LGPD minimizados: legal_documents, legal_document_versions,
-- acceptance_records, consent_records, consent_withdrawals.
-- Evidência técnica minimizada (session_evidence_id) sem persistência ostensiva
-- de IP/User-Agent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. legal_documents & legal_document_versions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_docs_global_code ON public.legal_documents(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_docs_tenant_code ON public.legal_documents(tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_legal_doc_version UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_doc ON public.legal_document_versions(document_id);

-- ---------------------------------------------------------------------------
-- 2. acceptance_records - Evidência técnica minimizada de aceite
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT,
  session_evidence_id TEXT NOT NULL, -- Identificador de sessão auditável
  evidence_metadata JSONB NOT NULL DEFAULT '{}',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acceptance_user ON public.acceptance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_doc ON public.acceptance_records(document_version_id);

-- ---------------------------------------------------------------------------
-- 3. consent_records & consent_withdrawals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_purpose ON public.consent_records(tenant_id, purpose);

CREATE TABLE IF NOT EXISTS public.consent_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES public.consent_records(id) ON DELETE CASCADE,
  reason TEXT,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_withdrawals_consent ON public.consent_withdrawals(consent_id);
