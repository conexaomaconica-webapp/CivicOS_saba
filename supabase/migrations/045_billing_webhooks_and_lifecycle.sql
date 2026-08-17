-- 0. HELPER FUNCTION DE AUTORIZAÇÃO PLATFORM ADMIN
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        LOWER(COALESCE(p.role, '')) IN ('admin', 'superadmin', 'platform_admin', 'master')
        OR COALESCE((p.raw_user_meta_data->>'is_platform_admin')::boolean, false) = true
      )
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- 1. TABELA DE IDEMPOTÊNCIA DE WEBHOOKS MULTI-GATEWAY (billing_webhook_events)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('asaas', 'stripe', 'mercadopago')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_billing_webhook_event UNIQUE (tenant_id, provider, provider_event_id)
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view webhook logs" ON public.billing_webhook_events;
CREATE POLICY "Platform admins can view webhook logs"
  ON public.billing_webhook_events FOR SELECT
  USING (public._is_platform_admin(auth.uid()));


-- 2. TABELA DE REGISTRO FINANCEIRO E AUDITORIA (financial_audit_logs)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  action_type TEXT NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view financial logs" ON public.financial_audit_logs;
CREATE POLICY "Platform admins can view financial logs"
  ON public.financial_audit_logs FOR SELECT
  USING (public._is_platform_admin(auth.uid()));


-- 3. EVOLUÇÃO DAS COLUNAS DE STATUS NA TABELA BUSINESSES (publication_status)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'businesses' 
      AND column_name = 'publication_status'
  ) THEN
    ALTER TABLE public.businesses 
      ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft' 
      CHECK (publication_status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended'));
  END IF;
END $$;


-- 4. EVOLUÇÃO DAS COLUNAS DE GRACE PERIOD NA TABELA SUBSCRIPTIONS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'subscriptions' 
      AND column_name = 'past_due_at'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN past_due_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'subscriptions' 
      AND column_name = 'grace_until'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN grace_until TIMESTAMPTZ;
  END IF;
END $$;


-- 5. RPC CANÔNICA DE PROCESSAMENTO DE EVENTOS DE BILLING (process_canonical_billing_event)
-- ----------------------------------------------------------------------------

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
) RETURNS JSONB AS $$
DECLARE
  v_already_processed BOOLEAN;
  v_clean_provider TEXT;
  v_clean_plan TEXT;
  v_current_sub RECORD;
BEGIN
  v_clean_provider := LOWER(p_provider);
  -- Garante que o plan_code é estritamente bronze, prata ou ouro (NUNCA ouro_founder)
  v_clean_plan := LOWER(COALESCE(p_plan_code, 'bronze'));
  IF v_clean_plan = 'ouro_founder' THEN
    v_clean_plan := 'ouro';
  END IF;

  -- A) Verificação de Idempotência por UNIQUE(tenant_id, provider, provider_event_id)
  SELECT EXISTS (
    SELECT 1 FROM public.billing_webhook_events
    WHERE tenant_id = p_tenant_id
      AND provider = v_clean_provider
      AND provider_event_id = p_provider_event_id
  ) INTO v_already_processed;

  IF v_already_processed THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_processed');
  END IF;

  -- B) Registra evento na tabela de idempotência
  INSERT INTO public.billing_webhook_events (
    tenant_id, provider, provider_event_id, event_type, payload
  ) VALUES (
    p_tenant_id, v_clean_provider, p_provider_event_id, p_canonical_event, p_payload
  );

  -- C) Trata os eventos canônicos de lifecycle
  IF p_canonical_event IN ('payment_confirmed', 'subscription_active', 'subscription_reactivated') THEN
    -- 1. Atualiza/Cria a assinatura ativa em public.subscriptions
    INSERT INTO public.subscriptions (
      tenant_id, business_id, plan_code, status, current_period_start, current_period_end, past_due_at, grace_until
    ) VALUES (
      p_tenant_id, p_business_id, v_clean_plan, 'active', now(), now() + interval '30 days', NULL, NULL
    )
    ON CONFLICT (tenant_id, business_id) 
    DO UPDATE SET 
      plan_code = EXCLUDED.plan_code,
      status = 'active',
      current_period_end = now() + interval '30 days',
      past_due_at = NULL,
      grace_until = NULL,
      updated_at = now();

    -- 2. Atualiza status da empresa: se era rascunho, vai para pending_review (NUNCA força published direto)
    UPDATE public.businesses
    SET publication_status = CASE 
          WHEN publication_status = 'draft' THEN 'pending_review'
          ELSE publication_status 
        END,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND id = p_business_id;

    -- 3. Registra auditoria financeira imutável
    INSERT INTO public.financial_audit_logs (
      tenant_id, business_id, user_id, provider, action_type, amount_cents, details
    ) VALUES (
      p_tenant_id, p_business_id, p_user_id, v_clean_provider, UPPER(p_canonical_event), p_amount_cents, p_payload
    );

  ELSIF p_canonical_event IN ('payment_failed', 'subscription_past_due') THEN
    -- Atualiza status da assinatura para past_due com carência de 7 dias
    UPDATE public.subscriptions
    SET status = 'past_due',
        past_due_at = COALESCE(past_due_at, now()),
        grace_until = COALESCE(grace_until, now() + interval '7 days'),
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND business_id = p_business_id;

    INSERT INTO public.financial_audit_logs (
      tenant_id, business_id, user_id, provider, action_type, amount_cents, details
    ) VALUES (
      p_tenant_id, p_business_id, p_user_id, v_clean_provider, 'PAYMENT_FAILED_GRACE_STARTED', p_amount_cents, p_payload
    );

  ELSIF p_canonical_event = 'subscription_canceled' THEN
    -- Cancelamento não revoga acesso imediatamente; mantém entitlement até current_period_end (período residual)
    UPDATE public.subscriptions
    SET status = 'canceled',
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND business_id = p_business_id;

    INSERT INTO public.financial_audit_logs (
      tenant_id, business_id, user_id, provider, action_type, amount_cents, details
    ) VALUES (
      p_tenant_id, p_business_id, p_user_id, v_clean_provider, 'SUBSCRIPTION_CANCELED_RESIDUAL', p_amount_cents, p_payload
    );

  ELSIF p_canonical_event IN ('payment_refunded', 'payment_chargeback') THEN
    -- Revogação imediata por reembolso/chargeback
    UPDATE public.subscriptions
    SET status = 'revoked',
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND business_id = p_business_id;

    UPDATE public.businesses
    SET is_published = false,
        publication_status = 'suspended',
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND id = p_business_id;

    INSERT INTO public.financial_audit_logs (
      tenant_id, business_id, user_id, provider, action_type, amount_cents, details
    ) VALUES (
      p_tenant_id, p_business_id, p_user_id, v_clean_provider, UPPER(p_canonical_event), p_amount_cents, p_payload
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'processed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
