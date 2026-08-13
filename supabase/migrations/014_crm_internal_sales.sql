-- ============================================================================
-- Product Migration: Conexão Maçônica - CRM Interno de Vendas (6.10)
-- ============================================================================
-- Operação da plataforma: crm_pipeline_stages, crm_prospects, crm_opportunities,
-- crm_activities, crm_proposals, crm_renewal_cases.
-- ISOLAMENTO FÍSICO E TENANCY: dados possuem tenant_id para escopo, mas acesso
-- operacional é cross-tenant para a equipe master/admin (tratado na camada RLS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. crm_pipeline_stages, crm_prospects & crm_opportunities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  win_probability NUMERIC(5, 2) DEFAULT 0.00,
  is_terminal_win BOOLEAN NOT NULL DEFAULT false,
  is_terminal_loss BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_tenant ON public.crm_pipeline_stages(tenant_id, display_order);

CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_prospects_tenant ON public.crm_prospects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_prospects_agent ON public.crm_prospects(assigned_agent_id);

CREATE OR REPLACE TRIGGER trg_crm_prospects_updated_at
  BEFORE UPDATE ON public.crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  target_plan_id UUID REFERENCES public.plans(id),
  estimated_value NUMERIC(12, 2),
  expected_close_date DATE,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant ON public.crm_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_prospect ON public.crm_opportunities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON public.crm_opportunities(stage_id);

CREATE OR REPLACE TRIGGER trg_crm_opportunities_updated_at
  BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. crm_activities, crm_proposals & crm_renewal_cases
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'meeting', 'whatsapp', 'email', 'note')),
  notes TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity ON public.crm_activities(opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_proposals_opportunity ON public.crm_proposals(opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_renewal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES auth.users(id),
  stage TEXT NOT NULL DEFAULT 'upcoming' CHECK (stage IN ('upcoming', 'in_negotiation', 'renewed', 'churned')),
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_renewal_cases_tenant ON public.crm_renewal_cases(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_renewal_cases_agent ON public.crm_renewal_cases(assigned_agent_id);
