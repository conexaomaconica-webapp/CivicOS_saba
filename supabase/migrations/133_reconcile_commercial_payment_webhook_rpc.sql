-- Migration 133: Reconciliação Canônica de Pagamento de Onboarding Comercial via Webhook Asaas
-- Microetapa 6.3: Transição segura de aguardando_pagamento -> pagamento_confirmado

-- 1. Garante colunas e índices em payment_attempts para busca rápida e indexada
ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS provider_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_received JSONB,
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_charge_id 
  ON public.payment_attempts(provider_charge_id)
  WHERE provider_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_payload_payment_id 
  ON public.payment_attempts ((payload_received->>'payment_id'))
  WHERE payload_received IS NOT NULL AND payload_received->>'payment_id' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_response_payment_id 
  ON public.payment_attempts ((response_received->>'payment_id'))
  WHERE response_received IS NOT NULL AND response_received->>'payment_id' IS NOT NULL;

-- 2. RPC Atômica para Reconciliação do Webhook Asaas
CREATE OR REPLACE FUNCTION public.reconcile_commercial_payment_webhook(
  p_provider_event_id TEXT,
  p_event_type TEXT,
  p_asaas_payment_id TEXT,
  p_amount_cents BIGINT DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_invoice_id UUID;
  v_business_id UUID;
  v_tenant_id UUID;
  v_attempt_id UUID;
  v_actor_id UUID;
  v_current_commercial_status TEXT;
  v_is_already_processed BOOLEAN := FALSE;
BEGIN
  -- 1. Idempotência do Evento Asaas
  IF p_provider_event_id IS NOT NULL AND p_provider_event_id <> '' THEN
    SELECT processed INTO v_is_already_processed
    FROM public.payment_provider_events
    WHERE provider_code = 'asaas' AND event_id = p_provider_event_id;

    IF v_is_already_processed IS TRUE THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'event_id', p_provider_event_id,
        'message', 'Evento do Asaas já foi processado anteriormente de forma idempotente.'
      );
    END IF;

    INSERT INTO public.payment_provider_events (
      provider_code,
      event_type,
      event_id,
      payload,
      processed,
      created_at
    )
    VALUES (
      'asaas',
      p_event_type,
      p_provider_event_id,
      p_raw_payload,
      FALSE,
      v_now
    )
    ON CONFLICT (provider_code, event_id) DO NOTHING;
  END IF;

  -- 2. Localização canônica interna: Asaas payment ID -> payment_attempts (com join em invoices) -> invoice -> business
  SELECT 
    pa.invoice_id, 
    COALESCE(pa.business_id, inv.business_id), 
    COALESCE(pa.tenant_id, inv.tenant_id), 
    pa.id
  INTO v_invoice_id, v_business_id, v_tenant_id, v_attempt_id
  FROM public.payment_attempts pa
  LEFT JOIN public.invoices inv ON inv.id = pa.invoice_id
  WHERE pa.provider_code = 'asaas'
    AND (
      pa.provider_charge_id = p_asaas_payment_id
      OR (pa.payload_received IS NOT NULL AND pa.payload_received->>'payment_id' = p_asaas_payment_id)
      OR (pa.response_received IS NOT NULL AND pa.response_received->>'payment_id' = p_asaas_payment_id)
    )
  ORDER BY pa.created_at DESC
  LIMIT 1;

  -- Fallback: Se não encontrou por payment_attempts, busca em invoices por idempotency_key contendo o payment ID
  IF v_invoice_id IS NULL THEN
    SELECT inv.id, inv.business_id, inv.tenant_id
    INTO v_invoice_id, v_business_id, v_tenant_id
    FROM public.invoices inv
    WHERE inv.idempotency_key LIKE '%' || p_asaas_payment_id || '%'
    ORDER BY inv.created_at DESC
    LIMIT 1;
  END IF;

  IF v_business_id IS NULL THEN
    IF p_provider_event_id IS NOT NULL THEN
      UPDATE public.payment_provider_events
      SET error_log = 'Cobrança interna não localizada para asaas_payment_id: ' || coalesce(p_asaas_payment_id, 'null')
      WHERE provider_code = 'asaas' AND event_id = p_provider_event_id;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cobrança interna não localizada para o Asaas payment ID informado: ' || coalesce(p_asaas_payment_id, 'null')
    );
  END IF;

  -- 3. Lock na empresa para transição atômica
  SELECT commercial_status
  INTO v_current_commercial_status
  FROM public.businesses
  WHERE id = v_business_id
  FOR UPDATE;

  -- 4. Processamento dos Eventos de Confirmação (PAYMENT_CONFIRMED ou PAYMENT_RECEIVED)
  IF p_event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN
    -- Se já estiver confirmado, retorna idempotente
    IF v_current_commercial_status = 'pagamento_confirmado' THEN
      IF p_provider_event_id IS NOT NULL THEN
        UPDATE public.payment_provider_events
        SET processed = TRUE,
            processed_at = v_now
        WHERE provider_code = 'asaas' AND event_id = p_provider_event_id;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'business_id', v_business_id,
        'commercial_status', v_current_commercial_status,
        'already_confirmed', true
      );
    END IF;

    -- Atualiza status comercial da empresa: aguardando_pagamento -> pagamento_confirmado
    UPDATE public.businesses
    SET commercial_status = 'pagamento_confirmado',
        updated_at = v_now
    WHERE id = v_business_id;

    -- Atualiza a fatura: status 'paid'
    IF v_invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET status = 'paid',
          amount_paid = amount_due,
          paid_at = coalesce(paid_at, v_now),
          updated_at = v_now
      WHERE id = v_invoice_id;
    END IF;

    -- Atualiza tentativa de pagamento
    IF v_attempt_id IS NOT NULL THEN
      UPDATE public.payment_attempts
      SET status = 'success',
          response_received = jsonb_set(
            coalesce(response_received, '{}'::jsonb),
            '{webhook_reconciled}',
            jsonb_build_object(
              'event_type', p_event_type,
              'event_id', p_provider_event_id,
              'reconciled_at', v_now
            )
          )
      WHERE id = v_attempt_id;
    END IF;

    -- Localiza ator para auditoria (evita erro de FK em admin_audit_logs)
    SELECT owner_id INTO v_actor_id FROM public.businesses WHERE id = v_business_id;
    IF v_actor_id IS NULL THEN
      SELECT id INTO v_actor_id FROM public.profiles WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;
    IF v_actor_id IS NULL THEN
      SELECT id INTO v_actor_id FROM public.profiles LIMIT 1;
    END IF;

    -- Registra auditoria formal se houver profile válido
    IF v_actor_id IS NOT NULL THEN
      INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        before_value,
        after_value,
        reason
      ) VALUES (
        v_tenant_id,
        v_actor_id,
        'RECONCILE_COMMERCIAL_PAYMENT_WEBHOOK',
        'businesses',
        v_business_id,
        jsonb_build_object('commercial_status', v_current_commercial_status),
        jsonb_build_object(
          'commercial_status', 'pagamento_confirmado',
          'event_type', p_event_type,
          'asaas_payment_id', p_asaas_payment_id,
          'invoice_id', v_invoice_id
        ),
        'Pagamento confirmado via Webhook Asaas (' || p_event_type || '). Liberação do Prontuário 360 pendente.'
      );
    END IF;
  ELSE
    -- Outros eventos (ex: PAYMENT_OVERDUE, PAYMENT_REFUNDED, etc.)
    -- São auditados sem alterar comercial_status para publicado
    SELECT owner_id INTO v_actor_id FROM public.businesses WHERE id = v_business_id;
    IF v_actor_id IS NULL THEN
      SELECT id INTO v_actor_id FROM public.profiles WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;
    IF v_actor_id IS NULL THEN
      SELECT id INTO v_actor_id FROM public.profiles LIMIT 1;
    END IF;

    IF v_actor_id IS NOT NULL THEN
      INSERT INTO public.admin_audit_logs (
        tenant_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        before_value,
        after_value,
        reason
      ) VALUES (
        v_tenant_id,
        v_actor_id,
        'ASAAS_WEBHOOK_EVENT_AUDITED',
        'businesses',
        v_business_id,
        jsonb_build_object('commercial_status', v_current_commercial_status),
        jsonb_build_object('event_type', p_event_type, 'asaas_payment_id', p_asaas_payment_id),
        'Evento Asaas auditado sem alteração de status da empresa.'
      );
    END IF;
  END IF;

  -- Marca evento como processado
  IF p_provider_event_id IS NOT NULL THEN
    UPDATE public.payment_provider_events
    SET processed = TRUE,
        processed_at = v_now
    WHERE provider_code = 'asaas' AND event_id = p_provider_event_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_business_id,
    'invoice_id', v_invoice_id,
    'previous_status', v_current_commercial_status,
    'new_status', CASE WHEN p_event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN 'pagamento_confirmado' ELSE v_current_commercial_status END,
    'event_type', p_event_type
  );
END;
$$;

-- Permissões estritas: apenas service_role pode executar reconciliação de webhook
REVOKE ALL ON FUNCTION public.reconcile_commercial_payment_webhook(TEXT, TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_commercial_payment_webhook(TEXT, TEXT, TEXT, BIGINT, JSONB) TO service_role;
