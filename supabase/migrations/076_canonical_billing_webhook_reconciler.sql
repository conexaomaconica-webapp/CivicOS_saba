-- ============================================================================
-- Migration 076: Canonical Billing Webhook Reconciler & Security Hardening (Bloco 7 - Etapa 1)
-- ============================================================================
-- Architecture:
-- 1. Gateway único ativo: Asaas (provider_code = 'asaas')
-- 2. Idempotência de Evento: public.payment_provider_events(provider_code, event_id)
-- 3. Idempotência de Transação: public.payments(provider_code, provider_transaction_id)
-- 4. Resolução de Plano: plan_version_id → plan_versions → plans
-- 5. Guardrail 1: Anti-Spoofing Cross-Tenant/Business (Autoridade Canônica no Banco)
-- 6. Guardrail 2: Hardening RPC SECURITY DEFINER + SET search_path = '' + REVOKE anon/authenticated
-- 7. Guardrail 3: Transação Atômica com Lock e Rollback Integral em Falha
-- 8. Refund Factual: payment_refunds auditável sem cancelamento automático de subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_canonical_billing_event(
  p_tenant_id UUID,
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_canonical_event TEXT,
  p_business_id UUID,
  p_user_id UUID,
  p_plan_code TEXT,
  p_amount_cents INTEGER,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider_code TEXT;
  v_provider_tx_id TEXT;
  v_already_processed BOOLEAN;
  v_clean_plan TEXT;
  v_plan_version_id UUID;
  v_canonical_tenant_id UUID;
  v_canonical_business_id UUID;
  v_canonical_invoice_id UUID;
  v_existing_payment RECORD;
  v_biz_tenant_id UUID;
  v_sub_id UUID;
  v_sub_status TEXT;
  v_period_id UUID;
  v_invoice_id UUID;
  v_payment_id UUID;
BEGIN
  -- Normaliza provedor
  v_provider_code := LOWER(COALESCE(p_provider, 'asaas'));

  -- Extrai provider_transaction_id do payload
  v_provider_tx_id := COALESCE(
    p_payload->'payment'->>'id',
    p_payload->>'id',
    p_payload->'payment'->>'externalReference'
  );

  -- ---------------------------------------------------------------------------
  -- GUARDRAIL 1: Resolução Canônica de Contexto Financeiro (Anti-Spoofing)
  -- ---------------------------------------------------------------------------
  -- Se houver provider_transaction_id registrado previamente no banco,
  -- resolvemos tenant_id e business_id rigorosamente a partir do banco.
  IF v_provider_tx_id IS NOT NULL THEN
    SELECT p.id, p.invoice_id INTO v_existing_payment
    FROM public.payments p
    WHERE p.provider_code = v_provider_code
      AND p.provider_transaction_id = v_provider_tx_id
    LIMIT 1;

    IF v_existing_payment.id IS NOT NULL THEN
      SELECT inv.tenant_id, inv.business_id, inv.id
      INTO v_canonical_tenant_id, v_canonical_business_id, v_canonical_invoice_id
      FROM public.invoices inv
      WHERE inv.id = v_existing_payment.invoice_id;
    END IF;
  END IF;

  -- Se não localizou transação prévia, resolvemos pela empresa informada no banco
  IF v_canonical_business_id IS NULL THEN
    IF p_business_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'blocked',
        'error', 'SPOOF_BLOCKED: business_id nao informado e transacao previa nao localizada'
      );
    END IF;

    -- Valida se a empresa existe e qual seu tenant legítimo
    SELECT b.tenant_id INTO v_biz_tenant_id
    FROM public.businesses b
    WHERE b.id = p_business_id;

    IF v_biz_tenant_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'blocked',
        'error', 'SPOOF_BLOCKED: Empresa nao existe no banco de dados'
      );
    END IF;

    -- Bloqueia tentativas de spoof cross-tenant
    IF p_tenant_id IS NOT NULL AND p_tenant_id != v_biz_tenant_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'blocked',
        'error', 'SPOOF_BLOCKED: Incompatibilidade entre tenant_id informado e tenant canônico da empresa'
      );
    END IF;

    v_canonical_tenant_id := v_biz_tenant_id;
    v_canonical_business_id := p_business_id;
  ELSE
    -- Se localizamos a transação prévia, a empresa informada no payload DEVE coincidir
    IF p_business_id IS NOT NULL AND p_business_id != v_canonical_business_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'blocked',
        'error', 'SPOOF_BLOCKED: Incompatibilidade entre business_id do payload e transacao financeira canonica'
      );
    END IF;

    IF p_tenant_id IS NOT NULL AND p_tenant_id != v_canonical_tenant_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'blocked',
        'error', 'SPOOF_BLOCKED: Incompatibilidade entre tenant_id do payload e transacao financeira canonica'
      );
    END IF;
  END IF;

  -- ---------------------------------------------------------------------------
  -- GUARDRAIL 3: Idempotência de Evento e Concorrência Atômica
  -- ---------------------------------------------------------------------------
  IF p_provider_event_id IS NULL OR btrim(p_provider_event_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'error',
      'error', 'INVALID_ARGUMENT: provider_event_id e obrigatório'
    );
  END IF;

  -- Insere o registro de evento pendente se ainda não existir
  INSERT INTO public.payment_provider_events (
    provider_code, event_type, event_id, payload, processed, created_at
  ) VALUES (
    v_provider_code, p_canonical_event, p_provider_event_id, p_payload, false, now()
  ) ON CONFLICT (provider_code, event_id) DO NOTHING;

  -- Lock da linha de evento para garantir execução atômica
  SELECT processed INTO v_already_processed
  FROM public.payment_provider_events
  WHERE provider_code = v_provider_code
    AND event_id = p_provider_event_id
  FOR UPDATE;

  IF v_already_processed = true THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_processed');
  END IF;

  -- ---------------------------------------------------------------------------
  -- RESOLUÇÃO DE PLANO DE NEGÓCIO (plan_version_id → plan_versions → plans)
  -- ---------------------------------------------------------------------------
  v_clean_plan := LOWER(COALESCE(p_plan_code, 'bronze'));
  IF v_clean_plan = 'ouro_founder' THEN
    v_clean_plan := 'ouro';
  END IF;

  SELECT pv.id INTO v_plan_version_id
  FROM public.plan_versions pv
  JOIN public.plans p ON p.id = pv.plan_id
  WHERE LOWER(p.code) = v_clean_plan
  ORDER BY pv.version DESC
  LIMIT 1;

  -- Fallback defensivo para qualquer plan_version ativa caso o código exato falhar
  IF v_plan_version_id IS NULL THEN
    SELECT pv.id INTO v_plan_version_id
    FROM public.plan_versions pv
    ORDER BY pv.created_at ASC
    LIMIT 1;
  END IF;

  -- ---------------------------------------------------------------------------
  -- RECONCILIAÇÃO FINANCEIRA POR TIPO DE EVENTO CANÔNICO
  -- ---------------------------------------------------------------------------

  IF p_canonical_event IN ('payment_confirmed', 'subscription_active', 'subscription_reactivated') THEN

    -- 1. Trata a Assinatura (subscriptions)
    SELECT id, status INTO v_sub_id, v_sub_status
    FROM public.subscriptions
    WHERE tenant_id = v_canonical_tenant_id
      AND business_id = v_canonical_business_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub_status = 'canceled' AND p_canonical_event = 'payment_confirmed' THEN
      -- GUARDRAIL TERMINAL: evento payment_confirmed tardio NUNCA reativa assinatura 'canceled'
      -- Mantém status 'canceled', apenas reconcilia pagamento
      NULL;
    ELSE
      IF v_sub_id IS NOT NULL THEN
        UPDATE public.subscriptions
        SET plan_version_id = COALESCE(v_plan_version_id, plan_version_id),
            status = 'active',
            current_period_start = COALESCE(current_period_start, now()),
            current_period_end = now() + interval '1 year',
            past_due_at = NULL,
            grace_until = NULL,
            canceled_at = NULL,
            updated_at = now()
        WHERE id = v_sub_id;
      ELSE
        INSERT INTO public.subscriptions (
          tenant_id, business_id, plan_version_id, status, current_period_start, current_period_end
        ) VALUES (
          v_canonical_tenant_id, v_canonical_business_id, v_plan_version_id, 'active', now(), now() + interval '1 year'
        ) RETURNING id INTO v_sub_id;
      END IF;
    END IF;

    -- 2. Trata Ciclo/Período (subscription_periods)
    IF v_sub_id IS NOT NULL THEN
      SELECT id INTO v_period_id
      FROM public.subscription_periods
      WHERE tenant_id = v_canonical_tenant_id
        AND subscription_id = v_sub_id
        AND is_closed = false
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_period_id IS NULL THEN
        INSERT INTO public.subscription_periods (
          tenant_id, subscription_id, period_start, period_end
        ) VALUES (
          v_canonical_tenant_id, v_sub_id, now(), now() + interval '1 year'
        ) RETURNING id INTO v_period_id;
      END IF;
    END IF;

    -- 3. Trata Fatura (invoices)
    SELECT id INTO v_invoice_id
    FROM public.invoices
    WHERE tenant_id = v_canonical_tenant_id
      AND business_id = v_canonical_business_id
      AND status IN ('draft', 'open', 'overdue')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invoice_id IS NULL THEN
      INSERT INTO public.invoices (
        tenant_id, subscription_period_id, business_id, invoice_number,
        amount_due, amount_paid, status, due_date, paid_at
      ) VALUES (
        v_canonical_tenant_id, v_period_id, v_canonical_business_id,
        'INV-' || substring(p_provider_event_id from 1 for 8),
        COALESCE(p_amount_cents / 100.0, 199.00),
        COALESCE(p_amount_cents / 100.0, 199.00),
        'paid', CURRENT_DATE, now()
      ) RETURNING id INTO v_invoice_id;
    ELSE
      UPDATE public.invoices
      SET status = 'paid',
          amount_paid = COALESCE(p_amount_cents / 100.0, amount_due),
          paid_at = now(),
          updated_at = now()
      WHERE id = v_invoice_id;
    END IF;

    -- 4. Trata Pagamento (payments)
    IF v_provider_tx_id IS NOT NULL THEN
      INSERT INTO public.payments (
        tenant_id, invoice_id, amount, payment_method, provider_code, provider_transaction_id, status, paid_at
      ) VALUES (
        v_canonical_tenant_id, v_invoice_id, COALESCE(p_amount_cents / 100.0, 199.00),
        'pix', v_provider_code, v_provider_tx_id, 'succeeded', now()
      )
      ON CONFLICT (provider_code, provider_transaction_id)
      DO UPDATE SET
        status = 'succeeded',
        paid_at = now()
      RETURNING id INTO v_payment_id;
    END IF;

    -- 5. Atualiza tentativas de pagamento pendentes
    UPDATE public.payment_attempts
    SET status = 'success', response_received = p_payload
    WHERE invoice_id = v_invoice_id AND status IN ('initiated', 'processing');

    -- 6. Transição de Status Editorial da Empresa: draft → pending_review
    -- Preserva pending_review e published intactos (separação entre elegibilidade financeira e aprovação editorial)
    UPDATE public.businesses
    SET publication_status = 'pending_review',
        updated_at = now()
    WHERE tenant_id = v_canonical_tenant_id
      AND id = v_canonical_business_id
      AND publication_status = 'draft';

  ELSIF p_canonical_event IN ('payment_failed', 'subscription_past_due') THEN

    -- Falha afeta apenas o ciclo atual. Precedência: não altera 'canceled'
    UPDATE public.subscriptions
    SET status = 'past_due',
        past_due_at = COALESCE(past_due_at, now()),
        grace_until = COALESCE(grace_until, now() + interval '7 days'),
        updated_at = now()
    WHERE tenant_id = v_canonical_tenant_id
      AND business_id = v_canonical_business_id
      AND status != 'canceled';

    UPDATE public.invoices
    SET status = 'overdue', updated_at = now()
    WHERE tenant_id = v_canonical_tenant_id
      AND business_id = v_canonical_business_id
      AND status = 'open';

  ELSIF p_canonical_event = 'subscription_canceled' THEN

    -- Estado terminal 'canceled'
    UPDATE public.subscriptions
    SET status = 'canceled',
        canceled_at = COALESCE(canceled_at, now()),
        updated_at = now()
    WHERE tenant_id = v_canonical_tenant_id
      AND business_id = v_canonical_business_id;

  ELSIF p_canonical_event IN ('payment_refunded', 'payment_chargeback') THEN

    -- REFUND FACTUAL: Insere registro em payment_refunds sem cancelar assinatura ou transformar invoice em uncollectible
    SELECT p.id INTO v_payment_id
    FROM public.payments p
    WHERE p.provider_code = v_provider_code
      AND (p.provider_transaction_id = v_provider_tx_id OR v_provider_tx_id IS NULL)
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_payment_id IS NOT NULL THEN
      INSERT INTO public.payment_refunds (
        payment_id, amount, reason, processed_by
      ) VALUES (
        v_payment_id,
        COALESCE(p_amount_cents / 100.0, 0.00),
        p_canonical_event,
        p_user_id
      );

      UPDATE public.payments
      SET status = 'refunded'
      WHERE id = v_payment_id;
    END IF;

  END IF;

  -- ---------------------------------------------------------------------------
  -- AUDITORIA E FINALIZAÇÃO DO EVENTO
  -- ---------------------------------------------------------------------------

  -- Log de auditoria financeira imutável
  INSERT INTO public.financial_audit_logs (
    tenant_id, business_id, user_id, provider, action_type, amount_cents, details
  ) VALUES (
    v_canonical_tenant_id, v_canonical_business_id, p_user_id,
    v_provider_code, UPPER(p_canonical_event), COALESCE(p_amount_cents, 0), p_payload
  );

  -- Compatibilidade com billing_webhook_events
  INSERT INTO public.billing_webhook_events (
    tenant_id, provider, provider_event_id, event_type, payload, status
  ) VALUES (
    v_canonical_tenant_id, v_provider_code, p_provider_event_id, p_canonical_event, p_payload, 'processed'
  ) ON CONFLICT DO NOTHING;

  -- Marca evento como processado em payment_provider_events
  UPDATE public.payment_provider_events
  SET processed = true,
      processed_at = now()
  WHERE provider_code = v_provider_code
    AND event_id = p_provider_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'processed',
    'event_type', p_canonical_event,
    'business_id', v_canonical_business_id,
    'tenant_id', v_canonical_tenant_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- GUARDRAIL 2: Restrição Estrita de Permissões de Execução (RPC Hardening)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.process_canonical_billing_event(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, INTEGER, JSONB
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.process_canonical_billing_event(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, INTEGER, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_canonical_billing_event(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, INTEGER, JSONB
) TO service_role;
