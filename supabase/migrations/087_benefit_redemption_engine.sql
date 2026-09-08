-- ============================================================================
-- Migration 087: Benefit Redemption Engine (BENEFITS-003)
-- Transactional RPC redeem_business_benefit with strict SECURITY DEFINER,
-- idempotency enforcement, SELECT FOR UPDATE locking, entitlement check,
-- 6-digit numeric public_code generation, LEAST expiration handling,
-- immutable snapshot creation and anon revocation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_business_benefit(
  p_benefit_id UUID,
  p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_existing JSONB;
  v_benefit RECORD;
  v_effective_plan TEXT;
  v_benefits_limit INT;
  v_global_count INT;
  v_user_limit INT;
  v_user_count INT;
  v_public_code VARCHAR(30);
  v_code_candidate VARCHAR(30);
  v_code_exists BOOLEAN;
  v_expires_at TIMESTAMPTZ;
  v_company_name TEXT;
  v_snapshot JSONB;
  v_result JSONB;
  i INT;
BEGIN
  -- 1. Checagem de Usuário Autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: Chave de idempotência é obrigatória.';
  END IF;

  -- 2. Verificação de Idempotência Prévia (Retorno Idempotente do Resgate)
  SELECT row_to_json(r)::jsonb INTO v_existing
  FROM public.business_benefit_redemptions r
  WHERE r.user_id = v_user_id
    AND r.benefit_id = p_benefit_id
    AND r.idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- 3. Lock Transacional no Benefício e Validação de Empresa/Publicação
  SELECT
    b.id,
    b.tenant_id,
    b.business_id,
    b.title,
    b.description,
    b.benefit_type,
    b.discount_percentage,
    b.discount_amount,
    b.discount_code,
    b.badge_text,
    b.redeem_instructions,
    b.valid_from,
    b.valid_until,
    b.status,
    b.is_active,
    b.max_redemptions,
    b.max_redemptions_per_user,
    b.terms,
    b.instructions,
    biz.is_active AS biz_active,
    biz.publication_status AS biz_pub_status,
    biz.name AS company_name
  INTO v_benefit
  FROM public.business_benefits b
  JOIN public.businesses biz ON biz.tenant_id = b.tenant_id AND biz.id = b.business_id
  WHERE b.id = p_benefit_id
  FOR UPDATE OF b;

  IF v_benefit.id IS NULL THEN
    RAISE EXCEPTION 'BENEFIT_NOT_FOUND: Benefício não encontrado.';
  END IF;

  -- 4. Validação de Status e Janela de Vigência
  IF v_benefit.status <> 'active' OR v_benefit.is_active = false THEN
    RAISE EXCEPTION 'BENEFIT_INACTIVE: Benefício não está ativo.';
  END IF;

  IF v_benefit.biz_active = false OR v_benefit.biz_pub_status <> 'published' THEN
    RAISE EXCEPTION 'BENEFIT_INACTIVE: Empresa associada não está publicada.';
  END IF;

  IF (v_benefit.valid_from IS NOT NULL AND v_benefit.valid_from > now()) OR
     (v_benefit.valid_until IS NOT NULL AND v_benefit.valid_until < now()) THEN
    RAISE EXCEPTION 'BENEFIT_EXPIRED: Benefício fora da janela de validade.';
  END IF;

  -- 5. Validação de Entitlement Comercial Vigente (via plano efetivo)
  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(v_benefit.tenant_id, v_benefit.business_id);

  v_benefits_limit := public._get_plan_entitlement(v_benefit.tenant_id, v_effective_plan, 'benefits_limit');

  IF v_benefits_limit <= 0 THEN
    RAISE EXCEPTION 'ENTITLEMENT_EXCEEDED: Plano comercial da empresa não inclui benefícios ativos.';
  END IF;

  -- 6. Validação de Limite Global de Resgates (max_redemptions)
  IF v_benefit.max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO v_global_count
    FROM public.business_benefit_redemptions
    WHERE benefit_id = p_benefit_id AND status <> 'cancelled';

    IF v_global_count >= v_benefit.max_redemptions THEN
      RAISE EXCEPTION 'LIMIT_EXCEEDED: Limite máximo de resgates deste benefício foi atingido.';
    END IF;
  END IF;

  -- 7. Validação de Limite por Usuário (max_redemptions_per_user)
  v_user_limit := COALESCE(v_benefit.max_redemptions_per_user, 1);
  SELECT COUNT(*) INTO v_user_count
  FROM public.business_benefit_redemptions
  WHERE benefit_id = p_benefit_id AND user_id = v_user_id AND status <> 'cancelled';

  IF v_user_count >= v_user_limit THEN
    RAISE EXCEPTION 'USER_LIMIT_EXCEEDED: Você já atingiu o limite de resgates para este benefício.';
  END IF;

  -- 8. Geração de Código Único Formatado: CM- + 6 Dígitos Numéricos (ex.: CM-483921)
  i := 0;
  LOOP
    i := i + 1;
    v_code_candidate := 'CM-' || LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0');
    
    SELECT EXISTS (
      SELECT 1 FROM public.business_benefit_redemptions WHERE public_code = v_code_candidate
    ) INTO v_code_exists;

    IF NOT v_code_exists OR i > 20 THEN
      v_public_code := v_code_candidate;
      EXIT;
    END IF;
  END LOOP;

  -- 9. Cálculo do Vencimento Truncado via LEAST (trata NULL explicitamente)
  v_expires_at :=
    CASE
      WHEN v_benefit.valid_until IS NULL
        THEN now() + interval '30 days'
      ELSE LEAST(
        now() + interval '30 days',
        v_benefit.valid_until
      )
    END;

  -- 10. Construção do Snapshot Imutável
  v_snapshot := jsonb_build_object(
    'title', v_benefit.title,
    'description', v_benefit.description,
    'discount_percentage', v_benefit.discount_percentage,
    'discount_amount', v_benefit.discount_amount,
    'discount_code', v_benefit.discount_code,
    'badge_text', v_benefit.badge_text,
    'redeem_instructions', v_benefit.redeem_instructions,
    'benefit_type', v_benefit.benefit_type,
    'company_name', v_benefit.company_name,
    'terms', v_benefit.terms,
    'instructions', v_benefit.instructions
  );

  -- 11. Inserção do Resgate Transacional
  INSERT INTO public.business_benefit_redemptions (
    tenant_id,
    business_id,
    benefit_id,
    user_id,
    public_code,
    status,
    redeemed_at,
    expires_at,
    benefit_snapshot,
    idempotency_key
  ) VALUES (
    v_benefit.tenant_id,
    v_benefit.business_id,
    p_benefit_id,
    v_user_id,
    v_public_code,
    'redeemed',
    now(),
    v_expires_at,
    v_snapshot,
    p_idempotency_key
  )
  RETURNING row_to_json(business_benefit_redemptions)::jsonb INTO v_result;

  -- 12. Atualização Automática de Status para 'exhausted' se atingiu o limite global
  IF v_benefit.max_redemptions IS NOT NULL AND (v_global_count + 1) >= v_benefit.max_redemptions THEN
    UPDATE public.business_benefits
    SET status = 'exhausted'
    WHERE id = p_benefit_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Permissões de Execução Estritas
REVOKE ALL ON FUNCTION public.redeem_business_benefit(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_business_benefit(UUID, UUID) TO authenticated;
