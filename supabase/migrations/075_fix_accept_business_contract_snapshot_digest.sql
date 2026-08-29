-- Migration 075: Fix pgcrypto digest call and add Postgres idempotency check to accept_business_contract_snapshot
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_contract_id UUID;
  v_version_id UUID;
  v_hash TEXT;
  v_snapshot_id UUID;
  v_acceptance_id UUID;
  v_existing_snapshot_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
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

  -- Buscar versão do contrato ou usar default
  SELECT id INTO v_version_id FROM public.contract_versions WHERE version = p_version LIMIT 1;
  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id FROM public.contract_versions LIMIT 1;
  END IF;

  IF v_version_id IS NULL THEN
    INSERT INTO public.contract_templates (code, title, description)
    VALUES ('termos_adesao_v1', 'Contrato de Adesão V1', 'Template padrão de adesão ao Guia')
    ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_contract_id;

    INSERT INTO public.contract_versions (template_id, version, content_markdown)
    VALUES (v_contract_id, 'v1.0', p_rendered_text)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_version_id FROM public.contract_versions LIMIT 1;
  END IF;

  -- Computa hash SHA-256 do snapshot renderizado usando pgcrypto ou sha256 nativo do Postgres
  BEGIN
    v_hash := encode(extensions.digest(p_rendered_text::bytea, 'sha256'), 'hex');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_hash := encode(public.digest(p_rendered_text::bytea, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
      v_hash := encode(sha256(convert_to(p_rendered_text, 'UTF8')), 'hex');
    END;
  END;

  -- Verificação de Idempotência: se já existe um contrato assinado recente para esta empresa com o mesmo hash, reutiliza!
  SELECT c.id, s.id INTO v_contract_id, v_existing_snapshot_id
  FROM public.contracts c
  JOIN public.contract_snapshots s ON s.contract_id = c.id
  WHERE c.business_id = p_business_id AND c.status = 'signed' AND s.sha256_hash = v_hash
  ORDER BY c.created_at DESC LIMIT 1;

  IF v_contract_id IS NOT NULL AND v_existing_snapshot_id IS NOT NULL THEN
    SELECT id INTO v_acceptance_id FROM public.contract_acceptances WHERE snapshot_id = v_existing_snapshot_id LIMIT 1;
    RETURN jsonb_build_object(
      'ok', true,
      'contract_id', v_contract_id,
      'snapshot_id', v_existing_snapshot_id,
      'acceptance_id', v_acceptance_id,
      'sha256_hash', v_hash,
      'signed_at', NOW()
    );
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
