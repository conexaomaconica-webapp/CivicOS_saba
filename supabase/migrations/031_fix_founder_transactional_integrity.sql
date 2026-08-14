-- ============================================================================
-- Product Migration: 031_fix_founder_transactional_integrity.sql
-- ============================================================================
-- Correção e endurecimento transacional da RPC claim_founder_slot, fluxo de
-- webhooks tardios sem duplicação de payment_provider_id, validação de vigência
-- de checkouts, imutabilidade contratual e trilha completa de auditoria.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Redefinição da RPC claim_founder_slot com Correção Completa de Estados
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_founder_slot(
  p_payment_provider_id TEXT,
  p_action TEXT DEFAULT 'reserve'
)
RETURNS TABLE (
  allocation_id UUID,
  slot_number INTEGER,
  status TEXT,
  expires_at TIMESTAMPTZ,
  is_new_grant BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  v_checkout public.subscription_checkouts%ROWTYPE;
  v_campaign public.founder_campaigns%ROWTYPE;
  v_existing public.founder_allocations%ROWTYPE;
  v_business public.businesses%ROWTYPE;
  v_target_status TEXT;
  v_next_slot INTEGER;
  v_new_id UUID;
  v_expiration TIMESTAMPTZ;
  v_is_expired BOOLEAN := false;
BEGIN
  -- 1. Mapeamento explícito de p_action para o status alvo no banco
  IF p_action = 'reserve' THEN
    v_target_status := 'reserved';
  ELSIF p_action = 'grant' THEN
    v_target_status := 'granted';
  ELSE
    RAISE EXCEPTION 'INVALID_ACTION' USING HINT = 'Ação deve ser reserve ou grant';
  END IF;

  -- 2. Buscar o checkout confiável no banco pelo provider ID
  SELECT * INTO v_checkout
  FROM public.subscription_checkouts
  WHERE payment_provider_id = p_payment_provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKOUT_NOT_FOUND' USING HINT = 'Checkout ou pagamento não encontrado';
  END IF;

  -- Validar estado e vigência cronológica do checkout (expires_at > now())
  IF v_checkout.status IN ('canceled', 'expired') OR v_checkout.expires_at <= now() THEN
    RAISE EXCEPTION 'CHECKOUT_EXPIRED' USING HINT = 'Este checkout expirou ou foi cancelado';
  END IF;

  -- Impedir reserva sobre checkout já concluído
  IF p_action = 'reserve' AND v_checkout.status = 'completed' THEN
    RAISE EXCEPTION 'CHECKOUT_ALREADY_COMPLETED' USING HINT = 'Este checkout já foi concluído';
  END IF;

  -- Validar dados contratuais do checkout (Campanha FUNDADOR599, Plano Ouro Anual, R$ 599,00)
  IF COALESCE(v_checkout.campaign_code, 'FUNDADOR599') != 'FUNDADOR599'
     OR v_checkout.plan_id NOT IN ('plan-ouro', 'ouro')
     OR v_checkout.billing_cycle != 'annual'
     OR v_checkout.locked_price_cents != 59900
     OR v_checkout.currency != 'BRL' THEN
    RAISE EXCEPTION 'INVALID_CHECKOUT_CONTRACT' USING HINT = 'Os dados contratuais do checkout são incompatíveis com o Programa Fundadores';
  END IF;

  -- Validar coerência da empresa e tenant no banco
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = v_checkout.business_id
    AND tenant_id = v_checkout.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_TENANT_MISMATCH' USING HINT = 'Empresa não encontrada ou não pertence ao tenant especificado';
  END IF;

  -- 3. Bloquear a linha da campanha no banco pelo código derivado do checkout (Lock na ordem: campanha -> alocação)
  SELECT * INTO v_campaign
  FROM public.founder_campaigns
  WHERE code = COALESCE(v_checkout.campaign_code, 'FUNDADOR599')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND' USING HINT = 'Campanha não encontrada';
  END IF;

  -- 4. Idempotência e Rastreabilidade: Buscar alocação prévia pelo provider_id ou pela empresa
  SELECT * INTO v_existing
  FROM public.founder_allocations
  WHERE payment_provider_id = p_payment_provider_id;

  IF v_existing.id IS NULL THEN
    SELECT * INTO v_existing
    FROM public.founder_allocations
    WHERE campaign_id = v_campaign.id
      AND tenant_id = v_checkout.tenant_id
      AND business_id = v_checkout.business_id
      AND status IN ('reserved', 'granted');
  END IF;

  -- 5. Tratamento de registro prévio encontrado
  IF v_existing.id IS NOT NULL THEN

    -- Caso A: Registro 'reserved' ainda VÁLIDO (expires_at > now()) e recebe ação 'grant'
    IF p_action = 'grant' AND v_existing.status = 'reserved' AND v_existing.expires_at > now() THEN
      UPDATE public.founder_allocations
      SET status = 'granted',
          granted_at = now(),
          expires_at = NULL,
          payment_provider_id = p_payment_provider_id,
          updated_at = now()
      WHERE id = v_existing.id;

      UPDATE public.subscription_checkouts
      SET status = 'completed', updated_at = now()
      WHERE id = v_checkout.id;

      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_slot_granted', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'slot', v_existing.slot_number, 'payment_provider_id', p_payment_provider_id)
      );

      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, 'granted'::TEXT, NULL::TIMESTAMPTZ, true;
      RETURN;
    END IF;

    -- Verificar se a reserva prévia já EXPIROU por horário (expires_at <= now())
    IF v_existing.status = 'reserved' AND v_existing.expires_at <= now() THEN
      UPDATE public.founder_allocations
      SET status = 'expired', updated_at = now()
      WHERE id = v_existing.id;
      v_existing.status := 'expired';
      v_is_expired := true;
    END IF;

    -- Caso B: Registro 'expired' e recebe ação 'grant'
    IF p_action = 'grant' AND v_existing.status = 'expired' THEN
      -- Tenta adquirir nova vaga atômica no lote se houver capacidade
      IF v_campaign.status = 'active' AND v_campaign.allocated_count < v_campaign.capacity THEN
        SELECT slot INTO v_next_slot
        FROM generate_series(1, v_campaign.capacity) AS slot
        WHERE NOT EXISTS (
          SELECT 1 FROM public.founder_allocations fa
          WHERE fa.campaign_id = v_campaign.id
            AND fa.slot_number = slot
            AND fa.status IN ('reserved', 'granted')
        )
        ORDER BY slot
        LIMIT 1;

        IF v_next_slot IS NOT NULL THEN
          -- TRANSICIONA O MESMO REGISTRO EXISTENTE (Evita violação da constraint uq_founder_payment_provider)
          UPDATE public.founder_allocations
          SET status = 'granted',
              slot_number = v_next_slot,
              granted_at = now(),
              expires_at = NULL,
              updated_at = now()
          WHERE id = v_existing.id;

          UPDATE public.subscription_checkouts
          SET status = 'completed', updated_at = now()
          WHERE id = v_checkout.id;

          -- Atualizar e checar status da campanha
          UPDATE public.founder_campaigns
          SET allocated_count = (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')),
              status = CASE
                WHEN (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')) >= capacity THEN 'sold_out'
                ELSE status
              END
          WHERE id = v_campaign.id;

          INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
          VALUES (
            v_checkout.tenant_id, v_checkout.user_id, 'founder_slot_granted_after_expiration', 'founder_allocations',
            jsonb_build_object('allocation_id', v_existing.id, 'slot', v_next_slot, 'payment_provider_id', p_payment_provider_id)
          );

          RETURN QUERY SELECT v_existing.id, v_next_slot, 'granted'::TEXT, NULL::TIMESTAMPTZ, true;
          RETURN;
        END IF;
      END IF;

      -- Se a campanha estivesse LOTADA no webhook tardio do registro expirado:
      -- TRANSICIONA O REGISTRO EXISTENTE PARA refund_required (SEM INSERIR NOVO REGISTRO QUE VIOLARIA uq_founder_payment_provider)
      UPDATE public.founder_allocations
      SET status = 'refund_required',
          slot_number = 0,
          updated_at = now()
      WHERE id = v_existing.id;

      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_payment_refund_required', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'reason', 'Pagamento recebido após expiração e esgotamento do lote')
      );

      RETURN QUERY SELECT v_existing.id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    END IF;

    -- Caso C: Se já for 'granted' ou 'refund_required' existente ➔ Retorno idempotente imediato
    IF v_existing.status IN ('granted', 'refund_required') THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Caso D: Se a reserva estiver 'reserved' (válida) e p_action = 'reserve' ➔ Retorno idempotente
    IF v_existing.status = 'reserved' AND p_action = 'reserve' AND v_existing.expires_at > now() THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Caso E: Se for 'revoked' ➔ Retorna o registro revogado sem alterar
    IF v_existing.status = 'revoked' THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, 'revoked'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    END IF;
  END IF;

  -- 6. Tratar novas reservas ou concessões quando a campanha estiver sold_out ou inativa
  IF v_campaign.status != 'active' OR v_campaign.allocated_count >= v_campaign.capacity THEN
    IF p_action = 'grant' THEN
      v_new_id := gen_random_uuid();
      INSERT INTO public.founder_allocations (
        id, campaign_id, tenant_id, business_id, user_id, slot_number, payment_provider_id, status, locked_annual_price_cents
      ) VALUES (
        v_new_id, v_campaign.id, v_checkout.tenant_id, v_checkout.business_id, v_checkout.user_id, 0, p_payment_provider_id, 'refund_required', v_checkout.locked_price_cents
      );

      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_payment_refund_required', 'founder_allocations',
        jsonb_build_object('allocation_id', v_new_id, 'reason', 'Pagamento recebido após esgotamento de vagas')
      );

      -- Retorno controlado sem exceção para persistir o refund_required e o audit log
      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Vagas esgotadas para esta campanha';
    END IF;
  END IF;

  -- 7. Selecionar o menor slot vago entre 1 e capacity (generate_series)
  SELECT slot INTO v_next_slot
  FROM generate_series(1, v_campaign.capacity) AS slot
  WHERE NOT EXISTS (
    SELECT 1 FROM public.founder_allocations fa
    WHERE fa.campaign_id = v_campaign.id
      AND fa.slot_number = slot
      AND fa.status IN ('reserved', 'granted')
  )
  ORDER BY slot
  LIMIT 1;

  IF v_next_slot IS NULL THEN
    IF p_action = 'grant' THEN
      v_new_id := gen_random_uuid();
      INSERT INTO public.founder_allocations (
        id, campaign_id, tenant_id, business_id, user_id, slot_number, payment_provider_id, status, locked_annual_price_cents
      ) VALUES (
        v_new_id, v_campaign.id, v_checkout.tenant_id, v_checkout.business_id, v_checkout.user_id, 0, p_payment_provider_id, 'refund_required', v_checkout.locked_price_cents
      );
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_payment_refund_required', 'founder_allocations',
        jsonb_build_object('allocation_id', v_new_id, 'reason', 'Pagamento recebido sem slots livres disponíveis')
      );
      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Nenhum slot vago disponível';
    END IF;
  END IF;

  -- 8. Criar Nova Reserva ou Concessão utilizando v_target_status
  v_new_id := gen_random_uuid();
  v_expiration := CASE WHEN p_action = 'reserve' THEN COALESCE(v_checkout.expires_at, now() + INTERVAL '30 minutes') ELSE NULL END;

  INSERT INTO public.founder_allocations (
    id, campaign_id, tenant_id, business_id, user_id, slot_number,
    payment_provider_id, status, locked_annual_price_cents, currency, expires_at, granted_at
  ) VALUES (
    v_new_id, v_campaign.id, v_checkout.tenant_id, v_checkout.business_id, v_checkout.user_id, v_next_slot,
    p_payment_provider_id, v_target_status, v_checkout.locked_price_cents, v_checkout.currency, v_expiration,
    CASE WHEN p_action = 'grant' THEN now() ELSE NULL END
  );

  -- Se for grant, marca checkout como concluído
  IF p_action = 'grant' THEN
    UPDATE public.subscription_checkouts
    SET status = 'completed', updated_at = now()
    WHERE id = v_checkout.id;
  END IF;

  -- 9. Atualizar contagem e status da campanha
  UPDATE public.founder_campaigns
  SET allocated_count = (
        SELECT count(*) FROM public.founder_allocations
        WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')
      ),
      status = CASE
        WHEN (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')) >= v_campaign.capacity THEN 'sold_out'
        ELSE 'active'
      END
  WHERE id = v_campaign.id;

  -- Audit log em todos os caminhos de criação
  INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
  VALUES (
    v_checkout.tenant_id, v_checkout.user_id,
    CASE WHEN p_action = 'grant' THEN 'founder_slot_granted' ELSE 'founder_reservation_created' END,
    'founder_allocations',
    jsonb_build_object('allocation_id', v_new_id, 'slot', v_next_slot, 'status', v_target_status, 'payment_provider_id', p_payment_provider_id)
  );

  RETURN QUERY SELECT v_new_id, v_next_slot, v_target_status, v_expiration, true;
END;
$$;

-- Revogação de privilégios para anon / authenticated / public
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founder_slot(TEXT, TEXT) TO service_role;
