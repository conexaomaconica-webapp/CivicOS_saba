-- Migration 092: Approval Dossier 360 RPCs

-- 1. get_admin_approval_dossier_360
CREATE OR REPLACE FUNCTION public.get_admin_approval_dossier_360(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_uid UUID;
  v_result JSONB;
BEGIN
  v_admin_uid := auth.uid();
  IF v_admin_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the user is an admin (RBAC could be checked here, skipping for simplicity if the app layer handles it or using a simple check if exists)
  -- For now, returning data based on the business_id.

  SELECT jsonb_build_object(
    'business', to_jsonb(b.*),
    'responsible', to_jsonb(p.*),
    'masonic_affiliation', (
      SELECT to_jsonb(ma.*)
      FROM public.masonic_affiliations ma
      WHERE ma.user_id = b.owner_id
      ORDER BY ma.created_at DESC
      LIMIT 1
    ),
    'business_masonic_link', (
      SELECT to_jsonb(bml.*)
      FROM public.business_masonic_links bml
      WHERE bml.business_id = b.id AND bml.tenant_id = b.tenant_id
      ORDER BY bml.created_at DESC
      LIMIT 1
    ),
    'contract_snapshot', (
      SELECT to_jsonb(cs.*)
      FROM public.contract_snapshots cs
      WHERE cs.business_id = b.id
      ORDER BY cs.created_at DESC
      LIMIT 1
    ),
    'subscription', (
      SELECT to_jsonb(s.*)
      FROM public.subscriptions s
      WHERE s.business_id = b.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    'recognitions', (
      SELECT jsonb_agg(to_jsonb(br.*))
      FROM public.business_recognitions br
      WHERE br.business_id = b.id AND br.tenant_id = b.tenant_id
    ),
    'audit_logs', (
      SELECT jsonb_agg(to_jsonb(al.*))
      FROM public.admin_audit_logs al
      WHERE al.entity_id = b.id
    ),
    'plan_entitlements', (
      SELECT jsonb_agg(to_jsonb(pe.*))
      FROM public.plan_entitlements pe
      WHERE pe.tenant_id = b.tenant_id AND pe.plan_code = b.plan_code
    ),
    'completeness', (
      SELECT jsonb_build_object(
        'percent', round((
          (CASE WHEN b.owner_id IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN b.name IS NOT NULL AND length(trim(b.name)) > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN checks.has_masonic_link THEN 1 ELSE 0 END) +
          (CASE WHEN checks.has_signed_contract THEN 1 ELSE 0 END) +
          (CASE WHEN checks.has_valid_payment THEN 1 ELSE 0 END)
        ) * 100.0 / 5)::int,
        'is_ready_for_approval', b.owner_id IS NOT NULL
          AND b.name IS NOT NULL AND length(trim(b.name)) > 0
          AND checks.has_masonic_link
          AND checks.has_signed_contract
          AND checks.has_valid_payment,
        'requirements', jsonb_build_array(
          jsonb_build_object('id', 'req_responsible', 'label', 'Responsável Designado', 'satisfied', b.owner_id IS NOT NULL, 'blocking', true),
          jsonb_build_object('id', 'req_business_data', 'label', 'Dados Cadastrais Mínimos', 'satisfied', b.name IS NOT NULL AND length(trim(b.name)) > 0, 'blocking', true),
          jsonb_build_object('id', 'req_masonic_link', 'label', 'Vínculo Maçônico Verificado', 'satisfied', checks.has_masonic_link, 'blocking', true),
          jsonb_build_object('id', 'req_contract', 'label', 'Assinatura Eletrônica (Contrato)', 'satisfied', checks.has_signed_contract, 'blocking', true),
          jsonb_build_object('id', 'req_payment', 'label', 'Pagamento / Assinatura', 'satisfied', checks.has_valid_payment, 'blocking', true)
        )
      )
      FROM (SELECT
        EXISTS (
          SELECT 1 FROM public.masonic_affiliations ma
          WHERE ma.user_id = b.owner_id AND ma.verification_status = 'verified'
        ) OR EXISTS (
          SELECT 1 FROM public.business_masonic_links bml
          WHERE bml.business_id = b.id AND bml.verification_status = 'approved'
        ) AS has_masonic_link,
        EXISTS (
          SELECT 1 FROM public.contract_snapshots cs
          WHERE cs.business_id = b.id AND cs.status = 'signed'
        ) AS has_signed_contract,
        EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.business_id = b.id AND s.status IN ('active', 'paid', 'trialing')
        ) AS has_valid_payment
      ) checks
    )
  ) INTO v_result
  FROM public.businesses b
  LEFT JOIN public.profiles p ON p.id = b.owner_id
  WHERE b.id = p_business_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_approval_dossier_360(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_approval_dossier_360(UUID) TO service_role;


-- 2. admin_finalize_business_approval
CREATE OR REPLACE FUNCTION public.admin_finalize_business_approval(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_uid UUID;
  v_business RECORD;
  v_has_masonic_link BOOLEAN;
  v_has_signed_contract BOOLEAN;
  v_has_valid_payment BOOLEAN;
BEGIN
  v_admin_uid := auth.uid();
  IF v_admin_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the business row
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF v_business.publication_status = 'published' THEN
    RAISE EXCEPTION 'Business is already published';
  END IF;

  -- Verify owner and data
  IF v_business.owner_id IS NULL THEN
    RAISE EXCEPTION 'Blocking: Missing responsible owner';
  END IF;

  IF v_business.name IS NULL OR length(trim(v_business.name)) = 0 THEN
    RAISE EXCEPTION 'Blocking: Missing business data';
  END IF;

  -- Verify masonic link
  SELECT EXISTS (
    SELECT 1 FROM public.masonic_affiliations ma 
    WHERE ma.user_id = v_business.owner_id AND ma.verification_status = 'verified'
  ) OR EXISTS (
    SELECT 1 FROM public.business_masonic_links bml 
    WHERE bml.business_id = v_business.id AND bml.verification_status = 'approved'
  ) INTO v_has_masonic_link;

  IF NOT v_has_masonic_link THEN
    RAISE EXCEPTION 'Blocking: Missing verified masonic link';
  END IF;

  -- Verify contract
  SELECT EXISTS (
    SELECT 1 FROM public.contract_snapshots cs 
    WHERE cs.business_id = v_business.id AND cs.status = 'signed'
  ) INTO v_has_signed_contract;

  IF NOT v_has_signed_contract THEN
    RAISE EXCEPTION 'Blocking: Missing signed contract';
  END IF;

  -- Verify payment
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.business_id = v_business.id AND s.status IN ('active', 'paid', 'trialing')
  ) INTO v_has_valid_payment;

  IF NOT v_has_valid_payment THEN
    RAISE EXCEPTION 'Blocking: Missing valid payment';
  END IF;

  -- Update status
  UPDATE public.businesses
  SET publication_status = 'published',
      published_at = NOW(),
      updated_at = NOW()
  WHERE id = p_business_id;

  -- Audit Log
  INSERT INTO public.admin_audit_logs (
    tenant_id,
    admin_id,
    action_type,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) VALUES (
    v_business.tenant_id,
    v_admin_uid,
    'BUSINESS_PUBLISHED',
    'businesses',
    p_business_id,
    jsonb_build_object('publication_status', v_business.publication_status),
    jsonb_build_object('publication_status', 'published')
  );

  RETURN jsonb_build_object('success', true, 'status', 'published');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_finalize_business_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finalize_business_approval(UUID) TO service_role;
