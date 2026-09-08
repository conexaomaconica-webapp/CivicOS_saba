-- ============================================================================
-- Migration 086: Business Benefits v2 & Redemptions Engine (BENEFITS-001)
-- Canonical Evolution of public.business_benefits, State Machine Migration,
-- Quota Enforcement by Operational Status, public.business_benefit_redemptions
-- Entity, Immutable Snapshot Protection Trigger, Strict RLS & Soft-Delete Archiving
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Evoluir a Tabela public.business_benefits
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_benefits
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS cta_type VARCHAR(40) NOT NULL DEFAULT 'redeem',
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(60),
  ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS max_redemptions INT,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_user INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS minimum_purchase NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_cumulative BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Check constraints para benefit_type e status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_business_benefits_benefit_type'
  ) THEN
    ALTER TABLE public.business_benefits
      ADD CONSTRAINT chk_business_benefits_benefit_type
      CHECK (benefit_type IN (
        'percentage_discount', 'fixed_discount', 'special_price', 'gift',
        'special_condition', 'buy_x_get_y', 'free_service', 'custom'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_business_benefits_status'
  ) THEN
    ALTER TABLE public.business_benefits
      ADD CONSTRAINT chk_business_benefits_status
      CHECK (status IN (
        'draft', 'scheduled', 'active', 'paused', 'expired', 'exhausted', 'archived'
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Backfill e Sincronização Unidirecional (status -> is_active)
-- ---------------------------------------------------------------------------

-- Backfill dos registros legados v1 baseados em is_active e janelas
UPDATE public.business_benefits
SET status = CASE
  WHEN is_active = false THEN 'paused'
  WHEN valid_until IS NOT NULL AND valid_until < now() THEN 'expired'
  WHEN valid_from IS NOT NULL AND valid_from > now() THEN 'scheduled'
  ELSE 'active'
END
WHERE status = 'draft';

-- Trigger unidirecional para derivar is_active exclusivamente de status = 'active'
CREATE OR REPLACE FUNCTION public._trg_sync_business_benefit_is_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_business_benefit_is_active ON public.business_benefits;
CREATE TRIGGER trg_sync_business_benefit_is_active
  BEFORE INSERT OR UPDATE ON public.business_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_sync_business_benefit_is_active();

-- ---------------------------------------------------------------------------
-- 3. Atualizar Trigger de Quota por Tier (consome em estados operacionais)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._trg_enforce_business_benefit_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_plan TEXT;
  v_max_benefits INT;
  v_active_count INT;
BEGIN
  -- Lock transacional na empresa pai
  PERFORM 1 FROM public.businesses
  WHERE tenant_id = NEW.tenant_id AND id = NEW.business_id
  FOR UPDATE;

  -- Resolver código do plano efetivo
  SELECT plan_code INTO v_effective_plan
  FROM public._effective_business_plan(NEW.tenant_id, NEW.business_id);

  -- Buscar limite via sistema de entitlements
  v_max_benefits := public._get_plan_entitlement(NEW.tenant_id, v_effective_plan, 'benefits_limit');

  -- Estados que consomem quota do plano: scheduled, active, paused, exhausted
  IF NEW.status IN ('scheduled', 'active', 'paused', 'exhausted') THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.business_benefits
    WHERE tenant_id = NEW.tenant_id
      AND business_id = NEW.business_id
      AND status IN ('scheduled', 'active', 'paused', 'exhausted')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_active_count + 1) > v_max_benefits THEN
      RAISE EXCEPTION 'LIMIT_EXCEEDED: Cota de benefícios do plano % excedida (Máximo: % benefícios operacionais).',
        UPPER(COALESCE(v_effective_plan, 'none')), v_max_benefits;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_benefit_quota ON public.business_benefits;
CREATE TRIGGER trg_enforce_business_benefit_quota
  BEFORE INSERT OR UPDATE ON public.business_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_enforce_business_benefit_quota();

-- ---------------------------------------------------------------------------
-- 4. Tabela public.business_benefit_redemptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_benefit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  benefit_id UUID NOT NULL REFERENCES public.business_benefits(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  public_code VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'redeemed',
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_confirmed_by UUID REFERENCES auth.users(id),
  sale_amount NUMERIC(10,2),
  cancelled_at TIMESTAMPTZ,
  benefit_snapshot JSONB NOT NULL,
  idempotency_key UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_benefit_redemptions_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_benefit_redemptions_status
    CHECK (status IN ('redeemed', 'used', 'expired', 'cancelled')),
  CONSTRAINT uq_benefit_redemption_idempotency
    UNIQUE (user_id, benefit_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_benefit_redemptions_lookup
  ON public.business_benefit_redemptions(tenant_id, business_id, benefit_id, status);

CREATE INDEX IF NOT EXISTS idx_benefit_redemptions_user
  ON public.business_benefit_redemptions(tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_benefit_redemptions_code
  ON public.business_benefit_redemptions(public_code);

CREATE OR REPLACE TRIGGER trg_business_benefit_redemptions_updated_at
  BEFORE UPDATE ON public.business_benefit_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Trigger de Imutabilidade do Snapshot e Dados de Contrato do Resgate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._trg_protect_business_benefit_redemption_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.benefit_id <> NEW.benefit_id OR
     OLD.business_id <> NEW.business_id OR
     OLD.tenant_id <> NEW.tenant_id OR
     OLD.user_id <> NEW.user_id OR
     OLD.public_code <> NEW.public_code OR
     OLD.redeemed_at <> NEW.redeemed_at OR
     OLD.benefit_snapshot <> NEW.benefit_snapshot OR
     (OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key) THEN
    RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Não é permitido alterar dados contratuais ou snapshot de um resgate efetuado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_benefit_redemption_immutability ON public.business_benefit_redemptions;
CREATE TRIGGER trg_protect_business_benefit_redemption_immutability
  BEFORE UPDATE ON public.business_benefit_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_protect_business_benefit_redemption_immutability();

-- ---------------------------------------------------------------------------
-- 6. RLS para business_benefits e business_benefit_redemptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_benefit_redemptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.business_benefits TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_benefit_redemptions TO authenticated;

-- Policy de SELECT Público Estrita em business_benefits
DROP POLICY IF EXISTS p_business_benefits_public_select ON public.business_benefits;
CREATE POLICY p_business_benefits_public_select ON public.business_benefits
  FOR SELECT TO PUBLIC
  USING (
    status = 'active'
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.tenant_id = business_benefits.tenant_id
        AND b.id = business_benefits.business_id
        AND b.is_active = true
        AND b.publication_status = 'published'
    )
  );

-- Policy de SELECT para Anunciante/Membro e Admin do Tenant em business_benefits
DROP POLICY IF EXISTS p_business_benefits_management_select ON public.business_benefits;
CREATE POLICY p_business_benefits_management_select ON public.business_benefits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_benefits.tenant_id
        AND bm.business_id = business_benefits.business_id
        AND bm.user_id = auth.uid()
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

-- Policy de WRITE para Anunciante/Membro e Admin do Tenant em business_benefits
DROP POLICY IF EXISTS p_business_benefits_write ON public.business_benefits;
CREATE POLICY p_business_benefits_write ON public.business_benefits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_benefits.tenant_id
        AND bm.business_id = business_benefits.business_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
    )
    OR public.has_tenant_admin_access(tenant_id)
  );

-- Policies RLS em business_benefit_redemptions
DROP POLICY IF EXISTS p_benefit_redemptions_user_select ON public.business_benefit_redemptions;
CREATE POLICY p_benefit_redemptions_user_select ON public.business_benefit_redemptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.tenant_id = business_benefit_redemptions.tenant_id
        AND bm.business_id = business_benefit_redemptions.business_id
        AND bm.user_id = auth.uid()
    )
    OR public.has_tenant_admin_access(tenant_id)
  );
