-- Migration 126: Commercial Status State Machine & Payment Reconciler Hardening
-- CivicOS SABA / Conexão Maçônica
-- Fase 1 do Onboarding Comercial: Padronização de Estados, Constraints e Proteção Transicional

-- ============================================================
-- 1. MIGRAÇÃO DE STATUS LEGADOS
-- ============================================================
-- Garante que registros legados ('interesse_recebido' ou NULL) passem para 'pre_cadastro'
UPDATE public.businesses
SET commercial_status = 'pre_cadastro'
WHERE commercial_status = 'interesse_recebido' OR commercial_status IS NULL;

-- ============================================================
-- 2. NOVO DEFAULT PARA NOVAS EMPRESAS
-- ============================================================
ALTER TABLE public.businesses
ALTER COLUMN commercial_status
SET DEFAULT 'pre_cadastro';

-- ============================================================
-- 3. CONSTRAINT CHECK COM OS 12 STATUS OFICIAIS
-- ============================================================
ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_commercial_status_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_commercial_status_check
CHECK (
  commercial_status IN (
    'pre_cadastro',
    'vinculo_informado',
    'vinculo_verificado',
    'dados_comerciais_conferidos',
    'contrato_gerado',
    'contrato_enviado',
    'contrato_assinado',
    'aguardando_pagamento',
    'pagamento_confirmado',
    'prontuario_em_configuracao',
    'pronto_para_publicar',
    'publicado'
  )
);

-- ============================================================
-- 4. HARDENING DA RPC RECONCILIADORA DE PAGAMENTO ASAAS
-- ============================================================
-- Apenas avança comercialmente para 'pagamento_confirmado' se o
-- status atual for estritamente 'aguardando_pagamento'.
-- O evento financeiro é sempre auditado em payment_provider_events.
CREATE OR REPLACE FUNCTION public.reconcile_commercial_payment_webhook(
  p_business_id UUID,
  p_provider VARCHAR(50) DEFAULT 'asaas',
  p_event_id VARCHAR(128) DEFAULT NULL,
  p_event_type VARCHAR(100) DEFAULT 'PAYMENT_RECEIVED',
  p_payment_status VARCHAR(50) DEFAULT 'RECEIVED',
  p_amount_cents INTEGER DEFAULT 0,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_biz_exists BOOLEAN;
  v_current_status VARCHAR(50);
  v_event_already_processed BOOLEAN;
  v_clean_provider VARCHAR(50);
BEGIN
  v_clean_provider := LOWER(COALESCE(p_provider, 'asaas'));

  -- 1. Verifica existência da empresa no banco e captura status comercial atual
  SELECT commercial_status INTO v_current_status
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada para conciliação');
  END IF;

  -- 2. Idempotência de Evento de Webhook
  IF p_event_id IS NOT NULL AND p_event_id <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.payment_provider_events 
      WHERE provider_code = v_clean_provider AND event_id = p_event_id
    ) INTO v_event_already_processed;

    IF v_event_already_processed THEN
      RETURN jsonb_build_object(
        'success', true, 
        'idempotent', true,
        'message', 'Evento de webhook já reconciliado anteriormente. Operação ignorada com sucesso.'
      );
    END IF;

    -- Registra evento financeiro no ledger de auditoria/idempotência
    INSERT INTO public.payment_provider_events (
      provider_code,
      event_id,
      event_type,
      payload,
      created_at
    )
    VALUES (
      v_clean_provider,
      p_event_id,
      p_event_type,
      p_payload,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Validação do Status Financeiro
  IF UPPER(p_payment_status) IN ('RECEIVED', 'CONFIRMED', 'SETTLED', 'APPROVED', 'PAID', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED') THEN
    -- Validação da Máquina de Estados: só avança se a empresa estiver em 'aguardando_pagamento'
    IF v_current_status <> 'aguardando_pagamento' THEN
      RETURN jsonb_build_object(
        'success', false,
        'payment_received', true,
        'requires_manual_review', true,
        'error', 'INVALID_COMMERCIAL_STATE',
        'current_status', v_current_status,
        'message', 'O pagamento foi recebido e auditado, mas a empresa não está no estado comercial "aguardando_pagamento".'
      );
    END IF;

    -- Atualiza status comercial da empresa para pagamento_confirmado
    UPDATE public.businesses
    SET 
      commercial_status = 'pagamento_confirmado',
      updated_at = NOW()
    WHERE id = p_business_id AND commercial_status = 'aguardando_pagamento';

    -- Ativa subscrição vinculada à empresa
    INSERT INTO public.subscriptions (
      business_id,
      status,
      billing_cycle,
      payment_method,
      updated_at
    )
    VALUES (
      p_business_id,
      'active',
      'annual',
      v_clean_provider,
      NOW()
    )
    ON CONFLICT (business_id) 
    DO UPDATE SET 
      status = 'active',
      updated_at = NOW();

    RETURN jsonb_build_object(
      'success', true, 
      'idempotent', false,
      'commercial_status', 'pagamento_confirmado',
      'message', 'Pagamento reconciliado e subscrição ativada com sucesso.'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Status de pagamento não autorizado para ativação: ' || p_payment_status
    );
  END IF;
END;
$$;

-- Restringe execução da RPC exclusivamente à Service Role
REVOKE EXECUTE ON FUNCTION public.reconcile_commercial_payment_webhook FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_commercial_payment_webhook TO service_role;
