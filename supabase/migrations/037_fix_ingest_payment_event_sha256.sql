-- ============================================================================
-- 037 — ingest_payment_event: sha256 nativo (fix digest/pgcrypto)
-- ============================================================================
-- O corpo original (033) usava pgcrypto digest() com search_path = pg_catalog,
-- public. Em ambientes onde pgcrypto vive no schema `extensions` (Supabase),
-- digest() não é resolvido dentro da função (erro 42883). Redefine a função
-- para o banco existente usando sha256(bytea) nativo do PostgreSQL (PG 11+,
-- pg_catalog — sempre resolvível). Comportamento idêntico ao 033 corrigido.
-- ============================================================================

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