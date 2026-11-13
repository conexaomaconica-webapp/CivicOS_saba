-- 228 - Módulo Comercial Nacional · Gate 1A · Fundação
--
-- Aditiva e INERTE: nenhuma tabela existente é alterada. Captura financeira e operação comercial
-- nascem DESLIGADAS (commercial_settings). Sem acesso direto para anon/authenticated nesta etapa;
-- políticas por papel entram no Gate 1B. Reversão: supabase/rollbacks/commercial/228_rollback.sql
--
-- Dependências verificadas: public.tenants(id), auth.users(id), public.update_updated_at() (001),
-- storage.buckets. Perfis (profiles.role) NÃO são alterados.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. commercial_settings · configuração por tenant (nada fixo no código)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Captura financeira (outbox): off = nada acontece; shadow = captura sem nunca bloquear pagamento;
  -- strict = erro de captura aborta a transação (uso em homologação).
  capture_mode TEXT NOT NULL DEFAULT 'off' CHECK (capture_mode IN ('off', 'shadow', 'strict')),
  -- Marco de início da captura: pagamentos anteriores a esta data NÃO geram eventos comissionáveis
  -- (evita retroativo acidental ao ligar o módulo). Obrigatório para ligar a captura.
  capture_starts_at TIMESTAMPTZ,
  -- Operação comercial (representantes, comissões, repasses). Exige captura ligada.
  module_enabled BOOLEAN NOT NULL DEFAULT false,
  referral_validity_days INT NOT NULL DEFAULT 30 CHECK (referral_validity_days BETWEEN 1 AND 365),
  lead_reservation_days INT NOT NULL DEFAULT 60 CHECK (lead_reservation_days BETWEEN 1 AND 365),
  default_hold_days INT NOT NULL DEFAULT 30 CHECK (default_hold_days BETWEEN 0 AND 365),
  closing_day INT NOT NULL DEFAULT 1 CHECK (closing_day BETWEEN 1 AND 28),
  commission_base TEXT NOT NULL DEFAULT 'gross_received' CHECK (commission_base IN ('gross_received')),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commercial_settings_module_requires_capture
    CHECK (NOT module_enabled OR capture_mode <> 'off'),
  CONSTRAINT commercial_settings_capture_requires_start
    CHECK (capture_mode = 'off' OR capture_starts_at IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- 2. commercial_access_grants · permissões comerciais específicas (sem tocar em profiles.role)
--    Um mesmo usuário pode ser anunciante E ter permissões comerciais.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN (
    'representatives.read', 'representatives.manage',
    'leads.manage', 'attributions.manage',
    'rules.manage', 'rules.approve',
    'commissions.read', 'commissions.approve',
    'payouts.manage', 'documents.read', 'settings.manage', 'audit.read'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commercial_access_grants_revoked_consistency
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_access_grants_active
  ON public.commercial_access_grants (tenant_id, user_id, permission) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_commercial_access_grants_user
  ON public.commercial_access_grants (tenant_id, user_id) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 3. commercial_representatives · cadastro PF/PJ
--    Registros nunca são apagados por suspensão/desligamento: créditos históricos permanecem (FKs RESTRICT).
--    Documento e chave PIX: apenas hash/últimos dígitos em claro; o valor é cifrado pela aplicação.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('pf', 'pj')),
  legal_name TEXT NOT NULL CHECK (length(btrim(legal_name)) > 0),
  trade_name TEXT,
  email TEXT NOT NULL CHECK (length(btrim(email)) > 3),
  phone TEXT,
  document_hash TEXT,
  document_last4 TEXT CHECK (document_last4 IS NULL OR document_last4 ~ '^[0-9A-Za-z]{2,4}$'),
  document_encrypted TEXT,
  pix_key_type TEXT CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key_encrypted TEXT,
  pix_key_hint TEXT,
  referral_code TEXT NOT NULL CHECK (referral_code ~ '^REP-[A-Z0-9]{6,10}$'),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'pending_review', 'active', 'suspended', 'terminated')),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  contract_version TEXT,
  contract_accepted_at TIMESTAMPTZ,
  tax_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  territory JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_representatives_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_commercial_representatives_code UNIQUE (tenant_id, referral_code),
  -- Para ficar ativo: contrato aceito e documento identificado.
  CONSTRAINT commercial_representatives_active_requirements
    CHECK (status <> 'active' OR (contract_accepted_at IS NOT NULL AND document_hash IS NOT NULL)),
  CONSTRAINT commercial_representatives_terminated_consistency
    CHECK (status <> 'terminated' OR terminated_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_representatives_document
  ON public.commercial_representatives (tenant_id, document_hash) WHERE document_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_representatives_user
  ON public.commercial_representatives (tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commercial_representatives_status
  ON public.commercial_representatives (tenant_id, status);

-- ---------------------------------------------------------------------------
-- 4. commercial_representative_documents · metadados; arquivos no bucket PRIVADO
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_representative_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'identity', 'cnpj_card', 'proof_of_address', 'contract', 'tax_form', 'payout_proof', 'other'
  )),
  storage_bucket TEXT NOT NULL DEFAULT 'commercial-documents' CHECK (storage_bucket = 'commercial-documents'),
  storage_path TEXT NOT NULL CHECK (length(btrim(storage_path)) > 0),
  original_filename TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_representative_documents_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_commercial_representative_documents_object UNIQUE (storage_bucket, storage_path),
  CONSTRAINT fk_commercial_documents_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_commercial_documents_representative
  ON public.commercial_representative_documents (tenant_id, representative_id);

-- ---------------------------------------------------------------------------
-- 5. Bucket PRIVADO para documentos e comprovantes comerciais
--    Sem policies em storage.objects: nenhum acesso para anon/authenticated (somente service role,
--    via URLs assinadas geradas no servidor). Policies específicas entram no Gate 1B.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'commercial-documents', 'commercial-documents', false, 10485760,
      ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. updated_at + RLS habilitada + sem acesso direto (service_role apenas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_settings', 'commercial_access_grants',
    'commercial_representatives', 'commercial_representative_documents'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
