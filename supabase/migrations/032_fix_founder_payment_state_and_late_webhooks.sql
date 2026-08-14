-- ============================================================================
-- Product Migration Proposal: 032_fix_founder_payment_state_and_late_webhooks.sql
-- ============================================================================
-- Endurecimento transacional de pagamentos do Programa Fundadores:
-- 1. Inclusão de payment_status confiável na tabela subscription_checkouts
-- 2. Aceite de webhooks tardios com pagamento confirmado (paid/authorized) independente de expires_at
-- 3. Recálculo atômico de capacidade ao expirar reservas durante a RPC
-- 4. Validação de privilégios e associação usuário-empresa
-- 5. Tratamento formal e auditado de status 'revoked'
-- 6. Trilha completa de auditoria em todos os caminhos transacionais
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Atualizar Tabela subscription_checkouts com payment_status
-- ---------------------------------------------------------------------------

ALTER TABLE public.subscription_checkouts
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'refund_required'));

-- ---------------------------------------------------------------------------
-- 2. Restringir RLS e Privilégios de Manipulação em subscription_checkouts
-- ---------------------------------------------------------------------------

-- Impedir que o usuário final (anon ou authenticated) insira ou altere o status de pagamento diretamente
DROP POLICY IF EXISTS "Users can insert checkouts" ON public.subscription_checkouts;
DROP POLICY IF EXISTS "Users can update checkouts" ON public.subscription_checkouts;

-- ---------------------------------------------------------------------------
-- 3. Redefinição da RPC claim_founder_slot com Autoridade de Pagamento Confiável
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
  v_active_count INTEGER;
BEGIN
  -- 1. Mapeamento explícito da ação para o status do banco
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
    RAISE EXCEPTION 'CHECKOUT_NOT_FOUND' USING HINT = 'Checkout ou pagamento não encontrado no sistema';
  END IF;

  -- 3. Validação temporal e de estado DIFERENCIADA por ação:
  IF p_action = 'reserve' THEN
    -- Reserva exige checkout vigente (expires_at > now()) e não cancelado
    IF v_checkout.status IN ('canceled', 'expired') OR v_checkout.expires_at <= now() THEN
      RAISE EXCEPTION 'CHECKOUT_EXPIRED' USING HINT = 'Este checkout expirou ou foi cancelado';
    END IF;

    IF v_checkout.status = 'completed' THEN
      RAISE EXCEPTION 'CHECKOUT_ALREADY_COMPLETED' USING HINT = 'Este checkout já foi concluído anteriormente';
    END IF;
  ELSIF p_action = 'grant' THEN
    -- Concessão (Grant) exige pagamento atestado como 'paid' ou 'authorized'
    IF v_checkout.payment_status NOT IN ('paid', 'authorized') THEN
      RAISE EXCEPTION 'UNCONFIRMED_PAYMENT' USING HINT = 'Concessão negada: O pagamento do checkout não está confirmado como paid ou authorized';
    END IF;

    IF v_checkout.status = 'canceled' THEN
      RAISE EXCEPTION 'CHECKOUT_CANCELED' USING HINT = 'Checkout cancelado não pode receber concessão';
    END IF;
    -- NOTA: Webhook tardio de pagamento confirmado (paid/authorized) NÃO é rejeitado apenas porque checkout.expires_at passou!
  END IF;

  -- 4. Validar dados contratuais do checkout (Campanha FUNDADOR599, Plano Ouro Anual, R$ 599,00)
  IF COALESCE(v_checkout.campaign_code, 'FUNDADOR599') != 'FUNDADOR599'
     OR v_checkout.plan_id NOT IN ('plan-ouro', 'ouro')
     OR v_checkout.billing_cycle != 'annual'
     OR v_checkout.locked_price_cents != 59900
     OR v_checkout.currency != 'BRL' THEN
    RAISE EXCEPTION 'INVALID_CHECKOUT_CONTRACT' USING HINT = 'Os dados contratuais do checkout são incompatíveis com o Programa Fundadores';
  END IF;

  -- 5. Validar pertencimento da empresa ao tenant e autorização do usuário
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = v_checkout.business_id
    AND tenant_id = v_checkout.tenant_id
    AND (owner_id = v_checkout.user_id OR public.has_tenant_admin_access(v_checkout.tenant_id));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_USER_UNAUTHORIZED' USING HINT = 'Empresa não pertence ao tenant ou usuário não possui autorização';
  END IF;

  -- 6. Bloquear a linha da campanha no banco pelo código derivado do checkout
  SELECT * INTO v_campaign
  FROM public.founder_campaigns
  WHERE code = COALESCE(v_checkout.campaign_code, 'FUNDADOR599')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND' USING HINT = 'Campanha não encontrada';
  END IF;

  -- 7. Buscar alocação prévia pelo provider_id ou pela empresa
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

  -- 8. Tratamento de alocação prévia existente
  IF v_existing.id IS NOT NULL THEN

    -- Caso A: Registro 'reserved' e VÁLIDO por horário (expires_at > now()) recebendo ação 'grant'
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

    -- Caso B: Se a reserva prévia EXPIROU por horário (expires_at <= now())
    IF v_existing.status = 'reserved' AND v_existing.expires_at <= now() THEN
      UPDATE public.founder_allocations
      SET status = 'expired', updated_at = now()
      WHERE id = v_existing.id;

      v_existing.status := 'expired';

      -- Auditoria de expiração detectada dentro da RPC
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_reservation_expired_in_rpc', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'slot', v_existing.slot_number)
      );

      -- RECALCULAR ATOMICAMENTE O CONTADOR DA CAMPANHA APÓS A EXPIRAÇÃO (Evita falso refund_required)
      SELECT count(*) INTO v_active_count
      FROM public.founder_allocations
      WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted');

      UPDATE public.founder_campaigns
      SET allocated_count = v_active_count,
          status = CASE WHEN v_active_count < capacity AND status = 'sold_out' THEN 'active' ELSE status END
      WHERE id = v_campaign.id;

      v_campaign.allocated_count := v_active_count;
    END IF;

    -- Caso C: Registro 'expired' e recebe ação 'grant' com pagamento confirmado
    IF p_action = 'grant' AND v_existing.status = 'expired' THEN
      IF v_campaign.allocated_count < v_campaign.capacity THEN
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

      -- Se a campanha estiver realmente LOTADA após o recálculo:
      UPDATE public.founder_allocations
      SET status = 'refund_required',
          slot_number = 0,
          updated_at = now()
      WHERE id = v_existing.id;

      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_payment_refund_required', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'reason', 'Pagamento recebido após expiração e esgotamento real do lote')
      );

      RETURN QUERY SELECT v_existing.id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    END IF;

    -- Caso D: Se o registro for 'revoked' (revogado administrativamente)
    IF v_existing.status = 'revoked' THEN
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_revoked_slot_access_attempt', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'payment_provider_id', p_payment_provider_id)
      );
      RAISE EXCEPTION 'SLOT_REVOKED' USING HINT = 'Esta alocação foi revogada administrativamente e bloqueia novas concessões diretas';
    END IF;

    -- Caso E: Se já for 'granted' ou 'refund_required' existente ➔ Retorno idempotente imediato
    IF v_existing.status IN ('granted', 'refund_required') THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Caso F: Se a reserva estiver 'reserved' (válida) e p_action = 'reserve' ➔ Retorno idempotente
    IF v_existing.status = 'reserved' AND p_action = 'reserve' AND v_existing.expires_at > now() THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;
  END IF;

  -- 9. Tratar novas reservas ou concessões quando a campanha estiver sold_out ou inativa
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

      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Vagas esgotadas para esta campanha';
    END IF;
  END IF;

  -- 10. Selecionar o menor slot vago entre 1 e capacity (generate_series)
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

  -- 11. Criar Nova Reserva ou Concessão
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

  IF p_action = 'grant' THEN
    UPDATE public.subscription_checkouts
    SET status = 'completed', updated_at = now()
    WHERE id = v_checkout.id;
  END IF;

  -- 12. Atualizar contagem e status da campanha
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

REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founder_slot(TEXT, TEXT) TO service_role;
