-- ============================================================================
-- Product Migration: Conexão Maçônica - Leads do Anunciante (6.11)
-- ============================================================================
-- Exclusivo para mensagens recebidas pelos anunciantes: leads, lead_messages,
-- lead_status_history, lead_consents, lead_conversion_events.
-- ISOLAMENTO FÍSICO CRÍTICO: acesso restrito ao anunciante proprietário da empresa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. leads & lead_messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  origin_channel TEXT NOT NULL DEFAULT 'portal_form' CHECK (origin_channel IN ('portal_form', 'whatsapp_click', 'coupon_claim')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed_won', 'closed_lost', 'archived')),
  has_masonic_regularity_badge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_leads_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_business ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(tenant_id, status, created_at);

CREATE OR REPLACE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'advertiser')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON public.lead_messages(lead_id);

-- ---------------------------------------------------------------------------
-- 2. lead_status_history, lead_consents & lead_conversion_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON public.lead_status_history(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_text TEXT NOT NULL,
  session_evidence_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_consents_lead ON public.lead_consents(lead_id);

CREATE TABLE IF NOT EXISTS public.lead_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL,
  value NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversion_events_lead ON public.lead_conversion_events(lead_id);
