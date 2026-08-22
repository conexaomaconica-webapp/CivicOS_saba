-- Migration 059: Contracts Versioning, Immutable Snapshots and Acceptances
-- Implements contract_templates, contract_versions, contracts, contract_snapshots and contract_acceptances tables with strict RLS and audit trails.

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.contract_versions(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'awaiting_signature', 'signed', 'voided', 'superseded')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  rendered_text TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES public.contract_snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  sha256_hash TEXT NOT NULL
);

-- RLS Security
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

-- Read Policies
CREATE POLICY "Public read active contract versions"
  ON public.contract_versions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view own contracts"
  ON public.contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = contracts.business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own contract acceptances"
  ON public.contract_acceptances FOR SELECT
  USING (user_id = auth.uid());

-- RPC for Immutable Contract Snapshot and Acceptance
CREATE OR REPLACE FUNCTION public.accept_contract_snapshot(
  p_contract_id UUID,
  p_rendered_text TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_hash TEXT;
  v_snapshot_id UUID;
  v_acceptance_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  IF p_rendered_text IS NULL OR btrim(p_rendered_text) = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: O texto do contrato renderizado é obrigatório.';
  END IF;

  -- Computa hash SHA-256 do snapshot renderizado
  v_hash := encode(digest(p_rendered_text, 'sha256'), 'hex');

  -- Insere o snapshot imutável
  INSERT INTO public.contract_snapshots (contract_id, rendered_text, sha256_hash)
  VALUES (p_contract_id, p_rendered_text, v_hash)
  RETURNING id INTO v_snapshot_id;

  -- Insere o aceite com evidência auditável
  INSERT INTO public.contract_acceptances (contract_id, snapshot_id, user_id, accepted_at, ip_address, user_agent, sha256_hash)
  VALUES (p_contract_id, v_snapshot_id, v_user_id, NOW(), p_ip_address, p_user_agent, v_hash)
  RETURNING id INTO v_acceptance_id;

  -- Atualiza o status do contrato para assinado
  UPDATE public.contracts
  SET status = 'signed', updated_at = NOW()
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'ok', true,
    'contract_id', p_contract_id,
    'snapshot_id', v_snapshot_id,
    'acceptance_id', v_acceptance_id,
    'sha256_hash', v_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_contract_snapshot(UUID, TEXT, TEXT, TEXT) TO authenticated;
