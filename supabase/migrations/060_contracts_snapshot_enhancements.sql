-- Migration 060: Enhancements for Contract Snapshots & RLS Read Policies
-- Reuses existing Migration 059 schema (contracts, contract_snapshots, contract_acceptances)

-- 1. Explicit RLS Read Policy for contract_snapshots for business owners and admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contract_snapshots' AND policyname = 'Owners and admins can view contract snapshots'
  ) THEN
    CREATE POLICY "Owners and admins can view contract snapshots"
      ON public.contract_snapshots FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.contracts c
          JOIN public.businesses b ON b.id = c.business_id
          WHERE c.id = contract_snapshots.contract_id
            AND (b.owner_id = auth.uid() OR EXISTS (
              SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('master', 'socio_admin')
            ))
        )
      );
  END IF;
END $$;

-- 2. Helper RPC to accept & freeze contract snapshot by business_id directly
CREATE OR REPLACE FUNCTION public.accept_business_contract_snapshot(
  p_business_id UUID,
  p_rendered_text TEXT,
  p_version TEXT DEFAULT 'v1.0',
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
  v_tenant_id UUID;
  v_contract_id UUID;
  v_version_id UUID;
  v_hash TEXT;
  v_snapshot_id UUID;
  v_acceptance_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Fallback for server-action calls using service role if user metadata passed
    v_user_id := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000101'::uuid);
  END IF;

  IF p_rendered_text IS NULL OR btrim(p_rendered_text) = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: O texto renderizado do contrato é obrigatório.';
  END IF;

  -- Obter tenant_id da empresa
  SELECT tenant_id INTO v_tenant_id FROM public.businesses WHERE id = p_business_id;
  IF v_tenant_id IS NULL THEN
    v_tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- Buscar versão do contrato ou usar default/criar se necessário
  SELECT id INTO v_version_id FROM public.contract_versions WHERE version = p_version LIMIT 1;
  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id FROM public.contract_versions LIMIT 1;
  END IF;

  IF v_version_id IS NULL THEN
    -- Fallback: insere template e versão padrão
    INSERT INTO public.contract_templates (code, title, description)
    VALUES ('termos_adesao_v1', 'Contrato de Adesão V1', 'Template padrão de adesão ao Guia')
    ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_contract_id;

    INSERT INTO public.contract_versions (template_id, version, content_markdown)
    VALUES (v_contract_id, 'v1.0', p_rendered_text)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_version_id FROM public.contract_versions LIMIT 1;
  END IF;

  -- Localiza contrato rascunho existente ou cria um novo
  SELECT id INTO v_contract_id FROM public.contracts 
  WHERE business_id = p_business_id AND status IN ('draft', 'awaiting_signature')
  ORDER BY created_at DESC LIMIT 1;

  IF v_contract_id IS NULL THEN
    INSERT INTO public.contracts (tenant_id, business_id, version_id, status)
    VALUES (v_tenant_id, p_business_id, v_version_id, 'awaiting_signature')
    RETURNING id INTO v_contract_id;
  END IF;

  -- Computa hash SHA-256 do snapshot renderizado
  v_hash := encode(digest(p_rendered_text, 'sha256'), 'hex');

  -- Insere o snapshot imutável congelado
  INSERT INTO public.contract_snapshots (contract_id, rendered_text, sha256_hash)
  VALUES (v_contract_id, p_rendered_text, v_hash)
  RETURNING id INTO v_snapshot_id;

  -- Insere o aceite com evidências auditáveis (IP, User-Agent, UTC timestamp)
  INSERT INTO public.contract_acceptances (contract_id, snapshot_id, user_id, accepted_at, ip_address, user_agent, sha256_hash)
  VALUES (v_contract_id, v_snapshot_id, v_user_id, NOW(), p_ip_address, p_user_agent, v_hash)
  RETURNING id INTO v_acceptance_id;

  -- Atualiza contrato para assinado
  UPDATE public.contracts
  SET status = 'signed', updated_at = NOW()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'ok', true,
    'contract_id', v_contract_id,
    'snapshot_id', v_snapshot_id,
    'acceptance_id', v_acceptance_id,
    'sha256_hash', v_hash,
    'signed_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_business_contract_snapshot(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_contract_snapshot(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 3. RPC para buscar o snapshot congelado do contrato assinado para renderização do PDF
CREATE OR REPLACE FUNCTION public.get_signed_contract_snapshot(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'ok', true,
    'contract_id', c.id,
    'business_id', c.business_id,
    'status', c.status,
    'rendered_text', s.rendered_text,
    'sha256_hash', s.sha256_hash,
    'accepted_at', a.accepted_at,
    'ip_address', a.ip_address,
    'user_agent', a.user_agent,
    'user_id', a.user_id
  ) INTO v_result
  FROM public.contracts c
  JOIN public.contract_snapshots s ON s.contract_id = c.id
  JOIN public.contract_acceptances a ON a.snapshot_id = s.id
  WHERE c.business_id = p_business_id
  ORDER BY a.accepted_at DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nenhum contrato assinado localizado para esta empresa.');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_signed_contract_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_signed_contract_snapshot(UUID) TO service_role;
