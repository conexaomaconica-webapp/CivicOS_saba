-- 229 - Módulo Comercial Nacional · Gate 1A · Leads, evidências e atribuições
--
-- Indicações B2B ficam SEPARADAS de business_referrals (B2C de membros).
-- A origem da indicação é preservada em commercial_referral_evidence ANTES da empresa existir,
-- e continua vinculada depois da conversão do lead em anunciante.
-- Reversão: supabase/rollbacks/commercial/229_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. commercial_leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  representative_id UUID,
  source TEXT NOT NULL CHECK (source IN ('representative', 'signup_invite', 'landing_page', 'admin')),
  company_name TEXT NOT NULL CHECK (length(btrim(company_name)) > 0),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  city TEXT,
  state TEXT,
  interested_plan_code TEXT CHECK (interested_plan_code IS NULL OR interested_plan_code IN ('esquadro', 'compasso', 'acacia')),
  -- Chave de duplicidade (hash normalizado de documento ou e-mail), calculada pela aplicação.
  dedupe_key TEXT NOT NULL CHECK (length(btrim(dedupe_key)) > 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'expired')),
  qualified_at TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signup_invite_id UUID REFERENCES public.business_signup_invites(id) ON DELETE SET NULL,
  landing_lead_id UUID REFERENCES public.landing_leads(id) ON DELETE SET NULL,
  converted_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_leads_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_leads_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_leads_qualified_requires_timestamp
    CHECK (status NOT IN ('qualified', 'proposal', 'won') OR qualified_at IS NOT NULL),
  CONSTRAINT commercial_leads_won_requires_business
    CHECK (status <> 'won' OR converted_business_id IS NOT NULL)
);

-- Um lead ativo por chave de duplicidade (impede dois representantes reservando o mesmo prospect).
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_leads_active_dedupe
  ON public.commercial_leads (tenant_id, dedupe_key)
  WHERE status IN ('new', 'contacted', 'qualified', 'proposal');
CREATE INDEX IF NOT EXISTS idx_commercial_leads_representative
  ON public.commercial_leads (tenant_id, representative_id, status);
CREATE INDEX IF NOT EXISTS idx_commercial_leads_reservation
  ON public.commercial_leads (reserved_until) WHERE status IN ('qualified', 'proposal');

-- ---------------------------------------------------------------------------
-- 2. commercial_lead_activities · critérios de atividade para a reserva de 60 dias
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'contact', 'meeting', 'proposal_sent', 'follow_up', 'qualification', 'status_change', 'note'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_commercial_lead_activities_lead
    FOREIGN KEY (tenant_id, lead_id)
    REFERENCES public.commercial_leads (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commercial_lead_activities_lead
  ON public.commercial_lead_activities (tenant_id, lead_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 3. commercial_referral_evidence · prova da origem, independente do ciclo de vida do lead/empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_referral_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'referral_link_visit', 'signup_invite', 'signup_form_submission', 'landing_form', 'admin_registration', 'document'
  )),
  reference_code TEXT,
  lead_id UUID,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  signup_invite_id UUID REFERENCES public.business_signup_invites(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_referral_evidence_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_evidence_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_evidence_lead
    FOREIGN KEY (tenant_id, lead_id)
    REFERENCES public.commercial_leads (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_commercial_evidence_representative
  ON public.commercial_referral_evidence (tenant_id, representative_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_evidence_business
  ON public.commercial_referral_evidence (business_id) WHERE business_id IS NOT NULL;

-- Evidência é imutável: só é permitido vincular lead/empresa depois (de NULL para um valor).
CREATE OR REPLACE FUNCTION public.commercial_guard_evidence_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.representative_id IS DISTINCT FROM OLD.representative_id
     OR NEW.evidence_type IS DISTINCT FROM OLD.evidence_type
     OR NEW.reference_code IS DISTINCT FROM OLD.reference_code
     OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
     OR NEW.evidence IS DISTINCT FROM OLD.evidence
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR (OLD.lead_id IS NOT NULL AND NEW.lead_id IS DISTINCT FROM OLD.lead_id)
     OR (OLD.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id)
     OR (OLD.signup_invite_id IS NOT NULL AND NEW.signup_invite_id IS DISTINCT FROM OLD.signup_invite_id)
  THEN
    RAISE EXCEPTION 'commercial_referral_evidence é imutável (apenas vínculos podem ser preenchidos).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_referral_evidence_guard ON public.commercial_referral_evidence;
CREATE TRIGGER trg_commercial_referral_evidence_guard
  BEFORE UPDATE ON public.commercial_referral_evidence
  FOR EACH ROW EXECUTE FUNCTION public.commercial_guard_evidence_update();

-- ---------------------------------------------------------------------------
-- 4. commercial_attributions · vínculo empresa ↔ representante
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  representative_id UUID NOT NULL,
  lead_id UUID,
  origin_evidence_id UUID,
  attribution_type TEXT NOT NULL CHECK (attribution_type IN ('referral_link', 'lead_registration', 'admin_assigned')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'revoked')),
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_commercial_attributions_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_commercial_attributions_business
    FOREIGN KEY (tenant_id, business_id)
    REFERENCES public.businesses (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_attributions_representative
    FOREIGN KEY (tenant_id, representative_id)
    REFERENCES public.commercial_representatives (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_attributions_lead
    FOREIGN KEY (tenant_id, lead_id)
    REFERENCES public.commercial_leads (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_commercial_attributions_evidence
    FOREIGN KEY (tenant_id, origin_evidence_id)
    REFERENCES public.commercial_referral_evidence (tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT commercial_attributions_confirmed_consistency
    CHECK (status <> 'confirmed' OR confirmed_at IS NOT NULL),
  CONSTRAINT commercial_attributions_revoked_consistency
    CHECK (status <> 'revoked' OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)),
  CONSTRAINT commercial_attributions_admin_requires_author
    CHECK (attribution_type <> 'admin_assigned' OR created_by IS NOT NULL)
);

-- Impede conflito de atribuição: uma única atribuição CONFIRMADA por empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_attributions_confirmed_business
  ON public.commercial_attributions (tenant_id, business_id) WHERE status = 'confirmed';
-- Uma pendente por (empresa, representante) e um vínculo vivo por lead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_attributions_pending
  ON public.commercial_attributions (tenant_id, business_id, representative_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_attributions_lead_live
  ON public.commercial_attributions (tenant_id, lead_id)
  WHERE lead_id IS NOT NULL AND status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_commercial_attributions_representative
  ON public.commercial_attributions (tenant_id, representative_id, status);

-- Núcleo da atribuição confirmada é imutável; só pode ser revogada (com motivo).
CREATE OR REPLACE FUNCTION public.commercial_guard_attribution_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status = 'confirmed' THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
       OR NEW.business_id IS DISTINCT FROM OLD.business_id
       OR NEW.representative_id IS DISTINCT FROM OLD.representative_id
       OR NEW.origin_evidence_id IS DISTINCT FROM OLD.origin_evidence_id
       OR NEW.attribution_type IS DISTINCT FROM OLD.attribution_type
       OR NEW.attributed_at IS DISTINCT FROM OLD.attributed_at
       OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN
      RAISE EXCEPTION 'Atribuição confirmada é imutável; revogue e crie uma nova com justificativa.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.status NOT IN ('confirmed', 'revoked') THEN
      RAISE EXCEPTION 'Atribuição confirmada só pode permanecer confirmada ou ser revogada.'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_attributions_guard ON public.commercial_attributions;
CREATE TRIGGER trg_commercial_attributions_guard
  BEFORE UPDATE ON public.commercial_attributions
  FOR EACH ROW EXECUTE FUNCTION public.commercial_guard_attribution_update();

-- ---------------------------------------------------------------------------
-- 5. updated_at + RLS habilitada + sem acesso direto (service_role apenas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commercial_leads', 'commercial_lead_activities',
    'commercial_referral_evidence', 'commercial_attributions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t
    );
  END LOOP;

  FOREACH t IN ARRAY ARRAY['commercial_leads', 'commercial_attributions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
