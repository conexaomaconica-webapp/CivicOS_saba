-- ============================================================================
-- Migration 255: Gate 1B — Campanhas Comerciais & Encerramento Seguro (Pedra Fundamental)
-- ============================================================================
-- Separa estritamente:
--   1. Disponibilidade comercial (status + janela)
--   2. Limite de vagas (max_redemptions / redeemed_count)
--   3. Vigência contratual (contract_duration_months)
--   4. Reconhecimento institucional (recognition_key em business_recognitions)
-- Totalmente aditiva, multi-tenant (RLS) e compatível com o futuro módulo de campanhas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  plan_code TEXT NOT NULL DEFAULT 'acacia',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'ended', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'admin_only' CHECK (visibility IN ('public', 'private_link', 'admin_only')),
  pay_in_full_cents INTEGER NOT NULL DEFAULT 120000 CHECK (pay_in_full_cents >= 0),
  installment_total_cents INTEGER NOT NULL DEFAULT 130000 CHECK (installment_total_cents >= 0),
  installments_max INTEGER NOT NULL DEFAULT 4 CHECK (installments_max >= 1),
  contract_duration_months INTEGER NOT NULL DEFAULT 24 CHECK (contract_duration_months >= 1),
  recognition_key TEXT,
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redeemed_count INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  allow_pending_completion BOOLEAN NOT NULL DEFAULT true,
  allow_admin_exception BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_campaigns_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_commercial_campaigns_capacity CHECK (max_redemptions IS NULL OR redeemed_count <= max_redemptions)
);

CREATE INDEX IF NOT EXISTS idx_commercial_campaigns_lookup
  ON public.commercial_campaigns (tenant_id, code, status);

CREATE TABLE IF NOT EXISTS public.commercial_campaign_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.commercial_campaigns(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.commercial_leads(id) ON DELETE SET NULL,
  target_document TEXT,
  target_email TEXT,
  justification TEXT NOT NULL CHECK (length(btrim(justification)) >= 10),
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized', 'consumed', 'revoked', 'expired')),
  authorized_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ,
  consumed_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_exception_has_target CHECK (
    business_id IS NOT NULL
    OR lead_id IS NOT NULL
    OR NULLIF(btrim(COALESCE(target_document, '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(target_email, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_exceptions_lookup
  ON public.commercial_campaign_exceptions (tenant_id, campaign_id, status);

-- Colunas aditivas e opcionais em business_commercial_terms (não sobrescreve histórico)
ALTER TABLE public.business_commercial_terms
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_code TEXT,
  ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS campaign_exception_id UUID REFERENCES public.commercial_campaign_exceptions(id) ON DELETE SET NULL;

-- RLS multi-tenant estrita
ALTER TABLE public.commercial_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_campaign_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read public active campaigns" ON public.commercial_campaigns;
CREATE POLICY "Public can read public active campaigns"
  ON public.commercial_campaigns FOR SELECT
  USING (
    visibility = 'public'
    AND status = 'active'
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

DROP POLICY IF EXISTS "Platform admin can manage commercial_campaigns" ON public.commercial_campaigns;
CREATE POLICY "Platform admin can manage commercial_campaigns"
  ON public.commercial_campaigns FOR ALL
  USING (public.has_platform_admin_access())
  WITH CHECK (public.has_platform_admin_access());

DROP POLICY IF EXISTS "Platform admin can manage commercial_campaign_exceptions" ON public.commercial_campaign_exceptions;
CREATE POLICY "Platform admin can manage commercial_campaign_exceptions"
  ON public.commercial_campaign_exceptions FOR ALL
  USING (public.has_platform_admin_access())
  WITH CHECK (public.has_platform_admin_access());

-- Função transacional atômica para validar e consumir vaga/exceção (race-safe)
CREATE OR REPLACE FUNCTION public.consume_commercial_campaign_slot(
  p_tenant_id UUID,
  p_campaign_code TEXT,
  p_business_id UUID DEFAULT NULL,
  p_target_document TEXT DEFAULT NULL,
  p_target_email TEXT DEFAULT NULL,
  p_exception_id UUID DEFAULT NULL
)
RETURNS TABLE (
  allowed BOOLEAN,
  campaign_id UUID,
  used_exception_id UUID,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_campaign public.commercial_campaigns%ROWTYPE;
  v_exc public.commercial_campaign_exceptions%ROWTYPE;
  v_doc TEXT := regexp_replace(COALESCE(p_target_document, ''), '\D', '', 'g');
  v_email TEXT := lower(btrim(COALESCE(p_target_email, '')));
BEGIN
  SELECT * INTO v_campaign
  FROM public.commercial_campaigns
  WHERE tenant_id = p_tenant_id
    AND code = p_campaign_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'CAMPAIGN_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- 1. Se campanha está ativa, dentro da janela e com capacidade disponível
  IF v_campaign.status = 'active'
     AND v_campaign.starts_at <= now()
     AND (v_campaign.ends_at IS NULL OR v_campaign.ends_at > now())
     AND (v_campaign.max_redemptions IS NULL OR v_campaign.redeemed_count < v_campaign.max_redemptions) THEN
    UPDATE public.commercial_campaigns
    SET redeemed_count = redeemed_count + 1,
        updated_at = now()
    WHERE id = v_campaign.id;

    RETURN QUERY SELECT true, v_campaign.id, NULL::UUID, 'ACTIVE_CAMPAIGN'::TEXT;
    RETURN;
  END IF;

  -- 2. Se campanha pausada/encerrada/lotada: verificar exceção vinculada especificamente
  IF v_campaign.allow_admin_exception THEN
    SELECT * INTO v_exc
    FROM public.commercial_campaign_exceptions e
    WHERE e.tenant_id = p_tenant_id
      AND e.campaign_id = v_campaign.id
      AND e.status = 'authorized'
      AND (e.expires_at IS NULL OR e.expires_at > now())
      AND (
        (p_exception_id IS NOT NULL AND e.id = p_exception_id)
        OR (p_business_id IS NOT NULL AND e.business_id = p_business_id)
        OR (v_doc <> '' AND regexp_replace(COALESCE(e.target_document, ''), '\D', '', 'g') = v_doc)
        OR (v_email <> '' AND lower(btrim(COALESCE(e.target_email, ''))) = v_email)
      )
    ORDER BY e.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.commercial_campaign_exceptions
      SET status = 'consumed',
          consumed_business_id = COALESCE(p_business_id, consumed_business_id),
          consumed_at = now(),
          updated_at = now()
      WHERE id = v_exc.id;

      UPDATE public.commercial_campaigns
      SET redeemed_count = redeemed_count + 1,
          updated_at = now()
      WHERE id = v_campaign.id;

      RETURN QUERY SELECT true, v_campaign.id, v_exc.id, 'AUTHORIZED_EXCEPTION'::TEXT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, v_campaign.id, NULL::UUID,
    CASE
      WHEN v_campaign.status = 'paused' THEN 'CAMPAIGN_PAUSED'
      WHEN v_campaign.status IN ('ended', 'archived') THEN 'CAMPAIGN_ENDED'
      WHEN v_campaign.max_redemptions IS NOT NULL AND v_campaign.redeemed_count >= v_campaign.max_redemptions THEN 'CAMPAIGN_CAPACITY_REACHED'
      ELSE 'CAMPAIGN_UNAVAILABLE'
    END::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_commercial_campaign_slot(UUID, TEXT, UUID, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_commercial_campaign_slot(UUID, TEXT, UUID, TEXT, TEXT, UUID) TO service_role;

-- Seed idempotente da campanha Pedra Fundamental por tenant existente
-- Inicia com status 'active' e max_redemptions alinhado ao histórico para permitir controle explícito pelo admin.
INSERT INTO public.commercial_campaigns (
  tenant_id,
  code,
  name,
  description,
  plan_code,
  status,
  visibility,
  pay_in_full_cents,
  installment_total_cents,
  installments_max,
  contract_duration_months,
  recognition_key,
  max_redemptions,
  redeemed_count,
  allow_pending_completion,
  allow_admin_exception
)
SELECT
  t.id,
  'PEDRA_FUNDAMENTAL',
  'Pedra Fundamental — Lançamento Oficial',
  'Condição especial de lançamento: Plano Acácia com vigência bienal (24 meses), R$ 1.200,00 à vista ou 4x de R$ 325,00 (R$ 1.300,00) + reconhecimento histórico Pedra Fundamental.',
  'acacia',
  'active',
  'admin_only',
  120000,
  130000,
  4,
  24,
  'pedra_fundamental',
  30,
  COALESCE((
    SELECT count(*)::integer
    FROM public.business_recognitions br
    WHERE br.tenant_id = t.id
      AND br.recognition_key = 'pedra_fundamental'
      AND br.is_active = true
  ), 0),
  true,
  true
FROM public.tenants t
ON CONFLICT (tenant_id, code) DO NOTHING;

NOTIFY pgrst, 'reload schema';

