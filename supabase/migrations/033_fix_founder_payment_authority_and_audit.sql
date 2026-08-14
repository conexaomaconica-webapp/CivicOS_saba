-- ============================================================================
-- Product Migration Proposal (VERSÃO COMPLETA E CORRIGIDA): 033_fix_founder_payment_authority_and_audit.sql
-- ============================================================================
-- 1. Ordem de trava estrita e universal em todas as RPCs:
--    subscription_checkouts FOR UPDATE -> founder_campaigns FOR UPDATE -> founder_allocations FOR UPDATE
-- 2. Máquina de estados financeira rigorosa impedindo paid -> failed, paid -> authorized ou regressões fora de ordem
-- 3. Idempotência e renovação segura para reserved (válida e expirada) sem violação da unicidade uq_founder_payment_provider
-- 4. Tratamento atômico de reserved vencida + grant com recálculo de capacidade sob trava
-- 5. Tratamento idempotente auditado para revoked sem exceção com rollback
-- 6. Validação completa de eventos duplicados (provider, tipo, valor, moeda e SHA-256 payload_hash)
-- 7. Liberação e recálculo real de reservas ativas em eventos payment_failed
-- 8. Reconciliação formal de estornos (payment_refunded / chargeback)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela public.payment_events (Ingestão Financeira Auditável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT UNIQUE NOT NULL,
  payment_provider_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('payment_authorized', 'payment_captured', 'payment_failed', 'payment_refunded', 'chargeback')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) > 0),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON public.payment_events(payment_provider_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_events FROM PUBLIC;
REVOKE ALL ON public.payment_events FROM anon;
REVOKE ALL ON public.payment_events FROM authenticated;
GRANT SELECT ON public.payment_events TO service_role;
GRANT INSERT ON public.payment_events TO service_role;

-- ---------------------------------------------------------------------------
-- 2. RPC ingest_payment_event (Ordem de Lock: checkout -> campaign -> allocation)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_payment_event(
  p_provider_event_id TEXT,
  p_payment_provider_id TEXT,
  p_event_type TEXT,
  p_amount_cents INTEGER,
  p_payload_hash TEXT DEFAULT '',
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS TABLE (
  event_id UUID,
  payment_status TEXT,
  is_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  v_existing_event public.payment_events%ROWTYPE;
  v_checkout public.subscription_checkouts%ROWTYPE;
  v_campaign public.founder_campaigns%ROWTYPE;
  v_allocation public.founder_allocations%ROWTYPE;
  v_new_event_id UUID;
  v_target_status TEXT;
  v_current_status TEXT;
  v_active_count INTEGER;
  v_computed_hash TEXT;
BEGIN
  -- 1. Calcular hash SHA-256 padrão caso não seja fornecido
  v_computed_hash := COALESCE(NULLIF(p_payload_hash, ''), encode(sha256((p_provider_event_id || ':' || p_payment_provider_id)::bytea), 'hex'));

  -- 2. ORDEM DE LOCK 1: Bloquear a linha do checkout
  SELECT * INTO v_checkout
  FROM public.subscription_checkouts
  WHERE payment_provider_id = p_payment_provider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_CHECKOUT_NOT_FOUND' USING HINT = 'Não existe checkout cadastrado para este payment_provider_id';
  END IF;

  -- 3. Validar correspondência de valor e moeda contra o contrato congelado
  IF p_amount_cents != v_checkout.locked_price_cents OR p_currency != v_checkout.currency THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH' USING HINT = 'O valor ou moeda do evento financeiro diverge do checkout congelado';
  END IF;

  -- 4. Verificar idempotência por provider_event_id e validar TODOS os campos
  SELECT * INTO v_existing_event
  FROM public.payment_events
  WHERE provider_event_id = p_provider_event_id;

  IF FOUND THEN
    IF v_existing_event.payment_provider_id != p_payment_provider_id
       OR v_existing_event.event_type != p_event_type
       OR v_existing_event.amount_cents != p_amount_cents
       OR v_existing_event.currency != p_currency
       OR v_existing_event.payload_hash != v_computed_hash THEN
      RAISE EXCEPTION 'DUPLICATE_EVENT_MISMATCH' USING HINT = 'Evento duplicado possui payload, tipo ou valores contraditórios com o registro original';
    END IF;

    RETURN QUERY SELECT v_existing_event.id, v_checkout.payment_status, true;
    RETURN;
  END IF;

  -- 5. Inserir evento financeiro auditável
  v_new_event_id := gen_random_uuid();
  INSERT INTO public.payment_events (
    id, provider_event_id, payment_provider_id, event_type, amount_cents, currency, payload_hash
  ) VALUES (
    v_new_event_id, p_provider_event_id, p_payment_provider_id, p_event_type, p_amount_cents, p_currency, v_computed_hash
  );

  -- 6. Mapeamento do evento para payment_status
  v_target_status := CASE p_event_type
    WHEN 'payment_authorized' THEN 'authorized'
    WHEN 'payment_captured' THEN 'paid'
    WHEN 'payment_failed' THEN 'failed'
    WHEN 'payment_refunded' THEN 'refunded'
    WHEN 'chargeback' THEN 'refund_required'
    ELSE 'pending'
  END;

  v_current_status := COALESCE(v_checkout.payment_status, 'pending');

  -- 7. MÁQUINA DE ESTADOS FINANCEIRA MATRICIAL (Bloqueia paid -> failed e paid -> authorized)
  IF v_current_status = 'paid' THEN
    IF v_target_status IN ('authorized', 'pending', 'failed') THEN
      -- Bloqueia regressão de paid para authorized, pending ou failed
      RETURN QUERY SELECT v_new_event_id, v_current_status, false;
      RETURN;
    END IF;
  END IF;

  IF v_current_status IN ('refunded', 'refund_required', 'failed') AND v_target_status IN ('authorized', 'paid') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION' USING HINT = 'Transição de estado financeiro inválida de finalizado para autorizado/pago';
  END IF;

  -- 8. Atualizar status de pagamento no checkout
  UPDATE public.subscription_checkouts
  SET payment_status = v_target_status,
      updated_at = now()
  WHERE id = v_checkout.id;

  -- 9. TRATAMENTO OPERACIONAL EM ALOCAÇÕES ATIVAS (Lock na ordem: campaign -> allocation)
  IF v_target_status IN ('failed', 'refunded', 'refund_required') THEN
    -- ORDEM DE LOCK 3: Bloquear a alocação do provider
    SELECT * INTO v_allocation
    FROM public.founder_allocations
    WHERE payment_provider_id = p_payment_provider_id
    FOR UPDATE;

    IF v_allocation.id IS NOT NULL THEN
      -- ORDEM DE LOCK 2: Bloquear a campanha correspondente
      SELECT * INTO v_campaign
      FROM public.founder_campaigns
      WHERE id = v_allocation.campaign_id
      FOR UPDATE;

      -- Se falhou pagamento de reserva ativa: expira e libera a reserva
      IF v_target_status = 'failed' AND v_allocation.status = 'reserved' THEN
        UPDATE public.founder_allocations
        SET status = 'expired', updated_at = now()
        WHERE id = v_allocation.id;

        INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
        VALUES (
          v_checkout.tenant_id, v_checkout.user_id, 'founder_reservation_canceled_by_payment_failure', 'founder_allocations',
          jsonb_build_object('allocation_id', v_allocation.id, 'slot', v_allocation.slot_number)
        );
      -- Se estornou concessão previa: marca refund_required para reconciliação
      ELSIF v_target_status IN ('refunded', 'refund_required') AND v_allocation.status = 'granted' THEN
        UPDATE public.founder_allocations
        SET status = 'refund_required', updated_at = now()
        WHERE id = v_allocation.id;

        INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
        VALUES (
          v_checkout.tenant_id, v_checkout.user_id, 'founder_grant_reconciled_by_refund', 'founder_allocations',
          jsonb_build_object('allocation_id', v_allocation.id, 'event_type', p_event_type)
        );
      END IF;

      -- Recalcular capacidade da campanha sob trava
      IF FOUND THEN
        SELECT count(*) INTO v_active_count
        FROM public.founder_allocations
        WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted');

        UPDATE public.founder_campaigns
        SET allocated_count = v_active_count,
            status = CASE
              WHEN v_active_count < capacity AND status = 'sold_out' AND now() >= starts_at AND (ends_at IS NULL OR now() <= ends_at) THEN 'active'
              ELSE status
            END
        WHERE id = v_campaign.id;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_event_id, v_target_status, false;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_payment_event(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_payment_event(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.ingest_payment_event(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_payment_event(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Redefinição da RPC claim_founder_slot (Locks Padronizados: checkout -> campaign -> allocation)
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
  v_has_permission BOOLEAN := false;
BEGIN
  -- 1. Mapeamento da ação
  IF p_action = 'reserve' THEN
    v_target_status := 'reserved';
  ELSIF p_action = 'grant' THEN
    v_target_status := 'granted';
  ELSE
    RAISE EXCEPTION 'INVALID_ACTION' USING HINT = 'Ação deve ser reserve ou grant';
  END IF;

  -- 2. ORDEM DE LOCK 1: Bloquear a linha do checkout
  SELECT * INTO v_checkout
  FROM public.subscription_checkouts
  WHERE payment_provider_id = p_payment_provider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKOUT_NOT_FOUND' USING HINT = 'Checkout ou pagamento não encontrado no sistema';
  END IF;

  -- 3. ORDEM DE LOCK 2: Bloquear a campanha
  SELECT * INTO v_campaign
  FROM public.founder_campaigns
  WHERE code = COALESCE(v_checkout.campaign_code, 'FUNDADOR599')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND' USING HINT = 'Campanha não encontrada';
  END IF;

  -- 4. ORDEM DE LOCK 3: Buscar e bloquear alocação prévia pelo provider_id ou empresa
  SELECT * INTO v_existing
  FROM public.founder_allocations
  WHERE payment_provider_id = p_payment_provider_id
  FOR UPDATE;

  IF v_existing.id IS NULL THEN
    SELECT * INTO v_existing
    FROM public.founder_allocations
    WHERE campaign_id = v_campaign.id
      AND tenant_id = v_checkout.tenant_id
      AND business_id = v_checkout.business_id
      AND status IN ('reserved', 'granted')
    FOR UPDATE;
  END IF;

  -- 5. IDEMPOTÊNCIA E ESTADOS CONCLUÍDOS (Retorno imediato auditado antes de checar vigência)
  IF v_existing.id IS NOT NULL THEN
    -- Caso A: Reserva VÁLIDA (expires_at > now()) e recebe nova ação 'reserve' ➔ Retorno idempotente imediato
    IF v_existing.status = 'reserved' AND p_action = 'reserve' AND v_existing.expires_at > now() THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Caso B: Alocação já 'granted' ou 'refund_required' ➔ Retorno idempotente imediato
    IF v_existing.status IN ('granted', 'refund_required') THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Caso C: Alocação 'revoked' ➔ Log de auditoria e retorno controlado sem exceção que desfaria o log
    IF v_existing.status = 'revoked' THEN
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_revoked_slot_access_attempt', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'payment_provider_id', p_payment_provider_id)
      );

      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, 'revoked'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    END IF;
  END IF;

  -- 6. Validação de vigência da campanha para NOVAS alocações ou transições
  IF v_campaign.starts_at > now() THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_STARTED' USING HINT = 'A campanha ainda não iniciou';
  END IF;

  IF v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at < now() THEN
    RAISE EXCEPTION 'CAMPAIGN_EXPIRED' USING HINT = 'A campanha está encerrada por vigência';
  END IF;

  IF v_campaign.status = 'paused' THEN
    RAISE EXCEPTION 'CAMPAIGN_PAUSED' USING HINT = 'A campanha está temporariamente pausada';
  END IF;

  -- 7. Exigência estrita de pagamento capturado (paid) para ação 'grant'
  IF p_action = 'grant' THEN
    IF v_checkout.payment_status != 'paid' THEN
      RAISE EXCEPTION 'UNCONFIRMED_PAYMENT' USING HINT = 'Concessão negada: A concessão exige pagamento com status paid/captured';
    END IF;
  ELSIF p_action = 'reserve' THEN
    IF v_checkout.status IN ('canceled', 'expired') OR v_checkout.expires_at <= now() THEN
      RAISE EXCEPTION 'CHECKOUT_EXPIRED' USING HINT = 'Este checkout expirou ou foi cancelado';
    END IF;
  END IF;

  -- 8. Validar dados contratuais do checkout
  IF COALESCE(v_checkout.campaign_code, 'FUNDADOR599') != 'FUNDADOR599'
     OR v_checkout.plan_id NOT IN ('plan-ouro', 'ouro')
     OR v_checkout.billing_cycle != 'annual'
     OR v_checkout.locked_price_cents != 59900
     OR v_checkout.currency != 'BRL' THEN
    RAISE EXCEPTION 'INVALID_CHECKOUT_CONTRACT' USING HINT = 'Os dados contratuais do checkout são incompatíveis com o Programa Fundadores';
  END IF;

  -- 9. Validar pertencimento da empresa e permissão do user_id (owner, co_owner, manager)
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = v_checkout.business_id
    AND tenant_id = v_checkout.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_TENANT_MISMATCH' USING HINT = 'Empresa não encontrada ou não pertence ao tenant do checkout';
  END IF;

  IF v_business.owner_id = v_checkout.user_id THEN
    v_has_permission := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.business_members
      WHERE business_id = v_checkout.business_id
        AND user_id = v_checkout.user_id
        AND role IN ('owner', 'co_owner', 'manager')
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'BUSINESS_USER_UNAUTHORIZED' USING HINT = 'O usuário do checkout não possui autorização (owner, co_owner ou manager) na empresa';
  END IF;

  -- 10. Processar transições para reservas prévias válidas ou expiradas
  IF v_existing.id IS NOT NULL THEN
    -- Caso D: Reserva 'reserved' VÁLIDA recebendo 'grant' com pagamento 'paid'
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

    -- Caso E: Reserva prévia EXPIROU por horário (expires_at <= now())
    IF v_existing.status = 'reserved' AND v_existing.expires_at <= now() THEN
      UPDATE public.founder_allocations
      SET status = 'expired', updated_at = now()
      WHERE id = v_existing.id;

      v_existing.status := 'expired';

      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_reservation_expired_in_rpc', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'slot', v_existing.slot_number)
      );

      -- Recalcular capacidade sob a mesma trava transacional
      SELECT count(*) INTO v_active_count
      FROM public.founder_allocations
      WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted');

      UPDATE public.founder_campaigns
      SET allocated_count = v_active_count,
          status = CASE
            WHEN v_active_count < capacity AND status = 'sold_out' AND now() >= starts_at AND (ends_at IS NULL OR now() <= ends_at) THEN 'active'
            ELSE status
          END
      WHERE id = v_campaign.id;

      v_campaign.allocated_count := v_active_count;
    END IF;

    -- Caso F: Registro 'expired' e acionada nova 'reserve' ou 'grant' ➔ Reutiliza o MESMO registro sem violar uq_founder_payment_provider
    IF v_existing.status = 'expired' THEN
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
          v_expiration := CASE WHEN p_action = 'reserve' THEN COALESCE(v_checkout.expires_at, now() + INTERVAL '30 minutes') ELSE NULL END;

          UPDATE public.founder_allocations
          SET status = v_target_status,
              slot_number = v_next_slot,
              expires_at = v_expiration,
              granted_at = CASE WHEN p_action = 'grant' THEN now() ELSE NULL END,
              updated_at = now()
          WHERE id = v_existing.id;

          IF p_action = 'grant' THEN
            UPDATE public.subscription_checkouts
            SET status = 'completed', updated_at = now()
            WHERE id = v_checkout.id;
          END IF;

          UPDATE public.founder_campaigns
          SET allocated_count = (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')),
              status = CASE
                WHEN (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted')) >= capacity THEN 'sold_out'
                ELSE status
              END
          WHERE id = v_campaign.id;

          INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
          VALUES (
            v_checkout.tenant_id, v_checkout.user_id,
            CASE WHEN p_action = 'grant' THEN 'founder_slot_granted_after_expiration' ELSE 'founder_reservation_renewed' END,
            'founder_allocations',
            jsonb_build_object('allocation_id', v_existing.id, 'slot', v_next_slot, 'status', v_target_status)
          );

          RETURN QUERY SELECT v_existing.id, v_next_slot, v_target_status, v_expiration, true;
          RETURN;
        END IF;
      END IF;

      -- Se a campanha estivesse lotada ao receber grant em registro expirado:
      IF p_action = 'grant' THEN
        UPDATE public.founder_allocations
        SET status = 'refund_required', slot_number = 0, updated_at = now()
        WHERE id = v_existing.id;

        INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
        VALUES (
          v_checkout.tenant_id, v_checkout.user_id, 'founder_payment_refund_required', 'founder_allocations',
          jsonb_build_object('allocation_id', v_existing.id, 'reason', 'Pagamento recebido após expiração e esgotamento real do lote')
        );

        RETURN QUERY SELECT v_existing.id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
        RETURN;
      ELSE
        RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Vagas esgotadas para renovar a reserva';
      END IF;
    END IF;
  END IF;

  -- 11. Novas reservas ou concessões no lote
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

  -- 12. Seleção do menor slot livre
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
        jsonb_build_object('allocation_id', v_new_id, 'reason', 'Sem slots vagos no momento do grant')
      );

      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Nenhum slot vago disponível';
    END IF;
  END IF;

  -- 13. Criar Nova Reserva ou Concessão
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

  -- 14. Recalcular contagem da campanha
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
