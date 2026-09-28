-- Migration 114: Commercial Onboarding Tokens, Security Hardening & Webhook Reconciler
-- CivicOS SABA / Conexão Maçônica

-- 1. Garante a coluna commercial_status na tabela businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'commercial_status'
  ) THEN
    ALTER TABLE businesses ADD COLUMN commercial_status VARCHAR(50) DEFAULT 'interesse_recebido';
  END IF;
END $$;

-- 2. Tabela business_onboarding_tokens com RLS restritivo
CREATE TABLE IF NOT EXISTS public.business_onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alta velocidade
CREATE INDEX IF NOT EXISTS idx_business_onboarding_tokens_token ON public.business_onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS idx_business_onboarding_tokens_business ON public.business_onboarding_tokens(business_id);

-- HARDENING DE RLS: Remove permissões públicas de consulta em massa
ALTER TABLE public.business_onboarding_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read onboarding token by exact match" ON public.business_onboarding_tokens;
DROP POLICY IF EXISTS "Service role full manage onboarding tokens" ON public.business_onboarding_tokens;

-- Apenas a role de serviço backend (ou autorizada via RPC) acessa os tokens
CREATE POLICY "Service role only onboarding tokens" 
  ON public.business_onboarding_tokens 
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.business_onboarding_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.business_onboarding_tokens TO service_role;

-- 3. Expande contract_snapshots para armazenar assinatura desenhada em PNG e auditoria
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_snapshots' AND column_name = 'signature_image_data'
  ) THEN
    ALTER TABLE public.contract_snapshots ADD COLUMN signature_image_data TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_snapshots' AND column_name = 'signer_cpf'
  ) THEN
    ALTER TABLE public.contract_snapshots ADD COLUMN signer_cpf VARCHAR(30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_snapshots' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.contract_snapshots ADD COLUMN ip_address VARCHAR(45);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_snapshots' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.contract_snapshots ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- HARDENING DE RLS EM CONTRACT_SNAPSHOTS
ALTER TABLE public.contract_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full manage contract snapshots" ON public.contract_snapshots;

CREATE POLICY "Service role only contract snapshots"
  ON public.contract_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.contract_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.contract_snapshots TO service_role;

-- 4. RPC Reconciliadora de Webhook com Hardening de Segurança (SECURITY DEFINER + search_path)
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
  v_event_already_processed BOOLEAN;
  v_clean_provider VARCHAR(50);
BEGIN
  v_clean_provider := LOWER(COALESCE(p_provider, 'asaas'));

  -- 1. Verifica existência da empresa no banco
  SELECT EXISTS(SELECT 1 FROM public.businesses WHERE id = p_business_id) INTO v_biz_exists;
  
  IF NOT v_biz_exists THEN
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

    -- Registra evento no ledger de idempotência
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
    UPDATE public.businesses
    SET 
      commercial_status = 'pagamento_confirmado',
      updated_at = NOW()
    WHERE id = p_business_id;

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
