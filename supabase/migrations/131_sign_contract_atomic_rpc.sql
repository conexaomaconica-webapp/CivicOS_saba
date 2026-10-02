-- Migration 131: RPC Atômica para Assinatura de Contrato Comercial e Hardening de IP
-- CivicOS SABA / Conexão Maçônica
-- Garante atomicidade rigorosa no fechamento da assinatura eletrônica.

CREATE OR REPLACE FUNCTION public.sign_commercial_contract_atomic(
  p_token_hash VARCHAR(64),
  p_signer_cpf VARCHAR(30),
  p_signature_image_data TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_id UUID;
  v_business_id UUID;
  v_contract_id UUID;
  v_snapshot_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_is_revoked BOOLEAN;
  v_tenant_id UUID;
  v_owner_id UUID;
  v_biz_commercial_status VARCHAR(50);
  v_biz_name TEXT;
  v_contract_status TEXT;
  v_snapshot_hash TEXT;
  v_accepted_at TIMESTAMPTZ;
BEGIN
  v_accepted_at := NOW();

  -- 1. Localiza e bloqueia o registro do token pelo token_hash
  SELECT id, business_id, contract_id, snapshot_id, expires_at, is_revoked
  INTO v_token_id, v_business_id, v_contract_id, v_snapshot_id, v_expires_at, v_is_revoked
  FROM public.business_onboarding_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'TOKEN_NOT_FOUND: Link de assinatura não encontrado ou inválido.';
  END IF;

  IF v_is_revoked THEN
    RAISE EXCEPTION 'TOKEN_REVOKED: Este link de assinatura já foi utilizado ou revogado.';
  END IF;

  IF v_expires_at < v_accepted_at THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED: Este link de assinatura expirou. Solicite um novo link à administração.';
  END IF;

  -- 2. Localiza e bloqueia a empresa correspondente
  SELECT tenant_id, owner_id, commercial_status, name
  INTO v_tenant_id, v_owner_id, v_biz_commercial_status, v_biz_name
  FROM public.businesses
  WHERE id = v_business_id
  FOR UPDATE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND: Empresa associada não encontrada.';
  END IF;

  IF v_biz_commercial_status != 'contrato_enviado' THEN
    RAISE EXCEPTION 'INVALID_COMMERCIAL_STATUS: O status da empresa (%) não permite assinatura.', v_biz_commercial_status;
  END IF;

  -- 3. Localiza e bloqueia o contrato
  IF v_contract_id IS NOT NULL THEN
    SELECT status INTO v_contract_status
    FROM public.contracts
    WHERE id = v_contract_id
    FOR UPDATE;
  ELSE
    SELECT id, status INTO v_contract_id, v_contract_status
    FROM public.contracts
    WHERE business_id = v_business_id AND status = 'awaiting_signature'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND: Contrato correspondente não encontrado.';
  END IF;

  IF v_contract_status != 'awaiting_signature' THEN
    RAISE EXCEPTION 'INVALID_CONTRACT_STATUS: O contrato não está aguardando assinatura (status: %).', v_contract_status;
  END IF;

  -- 4. Localiza o snapshot imutável
  IF v_snapshot_id IS NOT NULL THEN
    SELECT sha256_hash INTO v_snapshot_hash
    FROM public.contract_snapshots
    WHERE id = v_snapshot_id
    FOR UPDATE;
  ELSE
    SELECT id, sha256_hash INTO v_snapshot_id, v_snapshot_hash
    FROM public.contract_snapshots
    WHERE contract_id = v_contract_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_snapshot_id IS NULL THEN
    RAISE EXCEPTION 'SNAPSHOT_NOT_FOUND: Snapshot autorizado não localizado.';
  END IF;

  -- 5. Atualiza o snapshot com imagem de assinatura e dados probatórios
  UPDATE public.contract_snapshots
  SET signature_image_data = p_signature_image_data,
      signer_cpf = p_signer_cpf,
      ip_address = p_ip_address,
      user_agent = p_user_agent
  WHERE id = v_snapshot_id;

  -- 6. Insere o registro em contract_acceptances
  INSERT INTO public.contract_acceptances (
    contract_id,
    snapshot_id,
    user_id,
    accepted_at,
    ip_address,
    user_agent,
    sha256_hash
  )
  VALUES (
    v_contract_id,
    v_snapshot_id,
    v_owner_id,
    v_accepted_at,
    p_ip_address,
    p_user_agent,
    v_snapshot_hash
  );

  -- 7. Transiciona contrato para 'signed'
  UPDATE public.contracts
  SET status = 'signed',
      updated_at = v_accepted_at
  WHERE id = v_contract_id;

  -- 8. Transiciona empresa para 'contrato_assinado'
  UPDATE public.businesses
  SET commercial_status = 'contrato_assinado',
      updated_at = v_accepted_at
  WHERE id = v_business_id;

  -- 9. Revoga o token consumido impedindo reuso
  UPDATE public.business_onboarding_tokens
  SET is_revoked = TRUE,
      revoked_at = v_accepted_at
  WHERE id = v_token_id;

  -- 10. Registra auditoria
  INSERT INTO public.admin_audit_logs (
    tenant_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_value,
    after_value,
    reason
  )
  VALUES (
    v_tenant_id,
    v_owner_id,
    'SIGN_CONTRACT_PUBLIC_ATOMIC',
    'contract',
    v_contract_id,
    jsonb_build_object(
      'contract_status', 'awaiting_signature',
      'commercial_status', 'contrato_enviado'
    ),
    jsonb_build_object(
      'contract_status', 'signed',
      'commercial_status', 'contrato_assinado',
      'signer_cpf', p_signer_cpf,
      'accepted_at', v_accepted_at,
      'token_id', v_token_id,
      'snapshot_id', v_snapshot_id
    ),
    'Assinatura eletrônica realizada com sucesso de forma atômica via RPC.'
  );

  -- Retorna resultado estruturado
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'snapshot_id', v_snapshot_id,
    'business_id', v_business_id,
    'business_name', v_biz_name,
    'commercial_status', 'contrato_assinado',
    'accepted_at', v_accepted_at,
    'signer_cpf', p_signer_cpf
  );
END;
$$;

-- Permissões estritas da RPC: executável apenas por service_role
REVOKE ALL ON FUNCTION public.sign_commercial_contract_atomic(VARCHAR, VARCHAR, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_commercial_contract_atomic(VARCHAR, VARCHAR, TEXT, TEXT, TEXT) TO service_role;
