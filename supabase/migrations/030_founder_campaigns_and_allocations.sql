-- ============================================================================
-- Product Migration: 030_founder_campaigns_and_allocations.sql
-- ============================================================================
-- Infraestrutura transacional do Programa Fundadores (100 Vagas), suporte a
-- checkouts confiáveis, reservas temporárias, concessões imutáveis e controle de concorrência.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela founder_campaigns (Autoridade de Capacidade)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.founder_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity > 0),
  allocated_count INTEGER NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold_out', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_allocated_within_capacity CHECK (allocated_count <= capacity)
);

-- Trigger de updated_at
CREATE OR REPLACE TRIGGER trg_founder_campaigns_updated_at
  BEFORE UPDATE ON public.founder_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Tabela subscription_checkouts (Registro de Checkout Confiável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_provider_id TEXT UNIQUE NOT NULL,
  campaign_code TEXT REFERENCES public.founder_campaigns(code),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('annual', 'monthly')),
  locked_price_cents INTEGER NOT NULL CHECK (locked_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'canceled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkouts_provider ON public.subscription_checkouts(payment_provider_id);

CREATE OR REPLACE TRIGGER trg_subscription_checkouts_updated_at
  BEFORE UPDATE ON public.subscription_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Tabela founder_allocations (Registros de Concessão e Auditoria)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.founder_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.founder_campaigns(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 0),
  payment_provider_id TEXT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'granted', 'revoked', 'expired', 'refund_required')),

  -- Preço congelado e política
  locked_annual_price_cents INTEGER NOT NULL DEFAULT 59900 CHECK (locked_annual_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  price_locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_lock_policy TEXT NOT NULL DEFAULT 'v1_lifetime',

  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Invariantes de estado
  CONSTRAINT chk_reserved_requires_expiration CHECK (status != 'reserved' OR expires_at IS NOT NULL),
  CONSTRAINT chk_granted_requires_granted_at CHECK (status != 'granted' OR granted_at IS NOT NULL)
);

-- Índices Parciais Únicos (permitem reutilização legítima de vagas libertadas por expiração/revogação)
CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_active_slot
  ON public.founder_allocations(campaign_id, slot_number)
  WHERE status IN ('reserved', 'granted');

CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_active_business
  ON public.founder_allocations(campaign_id, tenant_id, business_id)
  WHERE status IN ('reserved', 'granted');

CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_payment_provider
  ON public.founder_allocations(payment_provider_id)
  WHERE payment_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_founder_allocations_business ON public.founder_allocations(business_id);
CREATE INDEX IF NOT EXISTS idx_founder_allocations_tenant ON public.founder_allocations(tenant_id);

CREATE OR REPLACE TRIGGER trg_founder_allocations_updated_at
  BEFORE UPDATE ON public.founder_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Trigger de Imutabilidade do Preço Congelado no Banco de Dados
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_founder_price_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IN ('reserved', 'granted')) THEN
    IF (NEW.locked_annual_price_cents IS DISTINCT FROM OLD.locked_annual_price_cents
        OR NEW.currency IS DISTINCT FROM OLD.currency
        OR NEW.price_locked_at IS DISTINCT FROM OLD.price_locked_at
        OR NEW.price_lock_policy IS DISTINCT FROM OLD.price_lock_policy) THEN
      RAISE EXCEPTION 'IMMUTABLE_PRICE_LOCKED' USING HINT = 'O preço e política congelados não podem ser alterados após a reserva ou concessão.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_founder_price_mutation
  BEFORE UPDATE ON public.founder_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_founder_price_mutation();

-- ---------------------------------------------------------------------------
-- 5. Seed Idempotente da Campanha FUNDADOR599
-- ---------------------------------------------------------------------------

INSERT INTO public.founder_campaigns (code, name, capacity, status, starts_at)
VALUES ('FUNDADOR599', 'Programa Fundadores — Lote 1', 100, 'active', now())
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. RPC claim_founder_slot (Restrita a service_role — Derivação 100% de Checkout)
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
  v_target_status TEXT;
  v_next_slot INTEGER;
  v_new_id UUID;
  v_expiration TIMESTAMPTZ;
BEGIN
  -- 1. Mapeamento explícito de p_action para o status do banco
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

  -- Validar coerência do checkout
  IF v_checkout.status IN ('canceled', 'expired') THEN
    RAISE EXCEPTION 'CHECKOUT_EXPIRED' USING HINT = 'Este checkout expirou ou foi cancelado';
  END IF;

  -- 3. Bloquear a linha da campanha no banco pelo código derivado do checkout
  SELECT * INTO v_campaign
  FROM public.founder_campaigns
  WHERE code = COALESCE(v_checkout.campaign_code, 'FUNDADOR599')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND' USING HINT = 'Campanha não encontrada';
  END IF;

  -- 4. Idempotência e Rastreabilidade: Buscar alocação prévia pelo provider_id ou empresa
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

  -- Se encontrou registro prévio:
  IF v_existing.id IS NOT NULL THEN
    -- Transição de 'reserved' para 'granted' se a ação for 'grant'
    IF p_action = 'grant' AND v_existing.status = 'reserved' THEN
      UPDATE public.founder_allocations
      SET status = 'granted',
          granted_at = now(),
          expires_at = NULL,
          payment_provider_id = p_payment_provider_id,
          updated_at = now()
      WHERE id = v_existing.id;

      -- Atualizar status do checkout
      UPDATE public.subscription_checkouts
      SET status = 'completed', updated_at = now()
      WHERE id = v_checkout.id;

      -- Audit log
      INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
      VALUES (
        v_checkout.tenant_id, v_checkout.user_id, 'founder_slot_granted', 'founder_allocations',
        jsonb_build_object('allocation_id', v_existing.id, 'slot', v_existing.slot_number, 'payment_provider_id', p_payment_provider_id)
      );

      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, 'granted'::TEXT, NULL::TIMESTAMPTZ, true;
      RETURN;
    END IF;

    -- Se a alocação estivesse 'expired' e chega webhook 'grant', transiciona o registro mantendo o histórico de provider_id!
    IF p_action = 'grant' AND v_existing.status = 'expired' THEN
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
          UPDATE public.founder_allocations
          SET status = 'granted',
              slot_number = v_next_slot,
              granted_at = now(),
              expires_at = NULL,
              updated_at = now()
          WHERE id = v_existing.id;

          -- Recalcular contagem
          UPDATE public.founder_campaigns
          SET allocated_count = (SELECT count(*) FROM public.founder_allocations WHERE campaign_id = v_campaign.id AND status IN ('reserved', 'granted'))
          WHERE id = v_campaign.id;

          RETURN QUERY SELECT v_existing.id, v_next_slot, 'granted'::TEXT, NULL::TIMESTAMPTZ, true;
          RETURN;
        END IF;
      END IF;
    END IF;

    -- Se já for 'granted' ou 'refund_required' existente, retorna resultado controlado idempotente sem apagar provider_id
    IF v_existing.status IN ('granted', 'refund_required') THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;

    -- Se a reserva estiver 'reserved' e a ação for 'reserve', retorna a reserva existente
    IF v_existing.status = 'reserved' AND p_action = 'reserve' THEN
      RETURN QUERY SELECT v_existing.id, v_existing.slot_number, v_existing.status, v_existing.expires_at, false;
      RETURN;
    END IF;
  END IF;

  -- 5. Tratar pagamentos recebidos ou reservas quando a campanha estiver sold_out ou inativa
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

      -- Retorna resultado controlado (SEM RAISE EXCEPTION) para garantir a gravação do refund_required no banco
      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Vagas esgotadas para esta campanha';
    END IF;
  END IF;

  -- 6. Selecionar o menor slot livre entre 1 e capacity (Seguro contra lacunas por expiração)
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
      RETURN QUERY SELECT v_new_id, 0, 'refund_required'::TEXT, NULL::TIMESTAMPTZ, false;
      RETURN;
    ELSE
      RAISE EXCEPTION 'CAMPAIGN_SOLD_OUT' USING HINT = 'Nenhum slot vago disponível';
    END IF;
  END IF;

  -- 7. Criar Nova Reserva ou Concessão utilizando o status mapeado v_target_status
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

  -- 8. Atualizar a contagem da campanha
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

  -- Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
  VALUES (
    v_checkout.tenant_id, v_checkout.user_id,
    CASE WHEN p_action = 'grant' THEN 'founder_slot_granted' ELSE 'founder_reservation_created' END,
    'founder_allocations',
    jsonb_build_object('allocation_id', v_new_id, 'slot', v_next_slot, 'status', v_target_status)
  );

  RETURN QUERY SELECT v_new_id, v_next_slot, v_target_status, v_expiration, true;
END;
$$;

-- Revogação estrita de privilégios de execução pública / anon / authenticated
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_founder_slot(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founder_slot(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Rotina de Liberação Transacional de Reservas Expiradas (Lock Order Preservada)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.release_expired_founder_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  v_campaign public.founder_campaigns%ROWTYPE;
  v_count INTEGER := 0;
  v_rec RECORD;
  v_active_count INTEGER;
BEGIN
  -- 1. Bloquear a campanha primeiro para respeitar a mesma ordem de travamento de claim_founder_slot
  SELECT * INTO v_campaign
  FROM public.founder_campaigns
  WHERE code = 'FUNDADOR599'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 2. Bloquear as reservas expiradas especificamente para a campanha bloqueada
  FOR v_rec IN
    SELECT fa.id, fa.campaign_id, fa.tenant_id, fa.user_id, fa.slot_number
    FROM public.founder_allocations fa
    WHERE fa.campaign_id = v_campaign.id
      AND fa.status = 'reserved'
      AND fa.expires_at IS NOT NULL
      AND fa.expires_at < now()
    FOR UPDATE OF fa
  LOOP
    UPDATE public.founder_allocations
    SET status = 'expired', updated_at = now()
    WHERE id = v_rec.id;

    v_count := v_count + 1;

    -- Auditoria
    INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, details)
    VALUES (
      v_rec.tenant_id, v_rec.user_id, 'founder_reservation_expired', 'founder_allocations',
      jsonb_build_object('allocation_id', v_rec.id, 'slot', v_rec.slot_number)
    );
  END LOOP;

  -- 3. Se houver expirações, recalcular a contagem e reabrir SOMENTE se estiver sold_out e vigente
  IF v_count > 0 THEN
    SELECT count(*) INTO v_active_count
    FROM public.founder_allocations
    WHERE campaign_id = v_campaign.id
      AND status IN ('reserved', 'granted');

    UPDATE public.founder_campaigns
    SET allocated_count = v_active_count,
        status = CASE
          -- Reabre SOMENTE se a campanha estava sold_out, possui capacidade e continua na janela de vigência
          WHEN status = 'sold_out'
               AND v_active_count < capacity
               AND now() >= starts_at
               AND (ends_at IS NULL OR now() <= ends_at) THEN 'active'
          ELSE status
        END
    WHERE id = v_campaign.id;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_founder_reservations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_expired_founder_reservations() FROM anon;
REVOKE ALL ON FUNCTION public.release_expired_founder_reservations() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_founder_reservations() TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.founder_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view active campaigns" ON public.founder_campaigns;
CREATE POLICY "Authenticated can view active campaigns"
  ON public.founder_campaigns FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status = 'active'
    AND now() >= starts_at
    AND (ends_at IS NULL OR now() <= ends_at)
  );

ALTER TABLE public.subscription_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkouts" ON public.subscription_checkouts;
CREATE POLICY "Users can view own checkouts"
  ON public.subscription_checkouts FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_tenant_admin_access(tenant_id)
  );

ALTER TABLE public.founder_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view founder allocations" ON public.founder_allocations;
CREATE POLICY "Business members can view founder allocations"
  ON public.founder_allocations FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager'])
    OR public.has_tenant_admin_access(tenant_id)
  );
