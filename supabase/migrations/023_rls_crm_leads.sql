-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: CRM Interno (010) + Leads (011)
-- ============================================================================
-- CRM: acesso operacional cross-tenant para equipe master/admin da plataforma
-- (Doc 02 §6.10) + tenant_admin no escopo do próprio tenant.
-- Leads: ISOLAMENTO FÍSICO CRÍTICO — somente o anunciante (business members)
-- acessa os leads recebidos de sua empresa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 010: crm_pipeline_stages
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage crm_pipeline_stages" ON public.crm_pipeline_stages;
CREATE POLICY "tenant_admin can manage crm_pipeline_stages"
  ON public.crm_pipeline_stages
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_pipeline_stages" ON public.crm_pipeline_stages;
CREATE POLICY "master can manage all crm_pipeline_stages"
  ON public.crm_pipeline_stages
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_prospects
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_prospects" ON public.crm_prospects;
CREATE POLICY "Assigned agent can view own crm_prospects"
  ON public.crm_prospects
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_prospects" ON public.crm_prospects;
CREATE POLICY "tenant_admin can manage crm_prospects"
  ON public.crm_prospects
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_prospects" ON public.crm_prospects;
CREATE POLICY "master can manage all crm_prospects"
  ON public.crm_prospects
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_opportunities
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "Assigned agent can view own crm_opportunities"
  ON public.crm_opportunities
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "tenant_admin can manage crm_opportunities"
  ON public.crm_opportunities
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_opportunities" ON public.crm_opportunities;
CREATE POLICY "master can manage all crm_opportunities"
  ON public.crm_opportunities
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_activities (sem tenant_id próprio; acesso via opportunity)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performing agent can view own crm_activities" ON public.crm_activities;
CREATE POLICY "Performing agent can view own crm_activities"
  ON public.crm_activities
  FOR SELECT
  USING (performed_by = auth.uid());

DROP POLICY IF EXISTS "Agent can manage own crm_activities" ON public.crm_activities;
CREATE POLICY "Agent can manage own crm_activities"
  ON public.crm_activities
  FOR ALL
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_opportunities o
      WHERE o.id = crm_activities.opportunity_id
        AND public.has_tenant_admin_access(o.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all crm_activities" ON public.crm_activities;
CREATE POLICY "master can manage all crm_activities"
  ON public.crm_activities
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_proposals (via opportunity)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can manage crm_proposals" ON public.crm_proposals;
CREATE POLICY "tenant_admin can manage crm_proposals"
  ON public.crm_proposals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_opportunities o
      WHERE o.id = crm_proposals.opportunity_id
        AND public.has_tenant_admin_access(o.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all crm_proposals" ON public.crm_proposals;
CREATE POLICY "master can manage all crm_proposals"
  ON public.crm_proposals
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 010: crm_renewal_cases
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_renewal_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned agent can view own crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "Assigned agent can view own crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR SELECT
  USING (assigned_agent_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can manage crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "tenant_admin can manage crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all crm_renewal_cases" ON public.crm_renewal_cases;
CREATE POLICY "master can manage all crm_renewal_cases"
  ON public.crm_renewal_cases
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 011: leads (anunciante) — ISOLAMENTO FÍSICO CRÍTICO
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender can view leads they submitted" ON public.leads;
CREATE POLICY "Sender can view leads they submitted"
  ON public.leads
  FOR SELECT
  USING (sender_user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can view own business leads" ON public.leads;
CREATE POLICY "Business members can view own business leads"
  ON public.leads
  FOR SELECT
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "Business members can manage own business leads" ON public.leads;
CREATE POLICY "Business members can manage own business leads"
  ON public.leads
  FOR ALL
  USING (
    public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS "tenant_admin can manage tenant leads" ON public.leads;
CREATE POLICY "tenant_admin can manage tenant leads"
  ON public.leads
  FOR ALL
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all leads" ON public.leads;
CREATE POLICY "master can manage all leads"
  ON public.leads
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- 011: lead_messages, lead_status_history, lead_consents, lead_conversion_events
-- (todos seguem o acesso da lead pai)
-- ---------------------------------------------------------------------------

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_messages" ON public.lead_messages;
CREATE POLICY "Users with access to lead can view lead_messages"
  ON public.lead_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_messages.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_messages" ON public.lead_messages;
CREATE POLICY "Business members can manage lead_messages"
  ON public.lead_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_messages.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_messages" ON public.lead_messages;
CREATE POLICY "master can manage all lead_messages"
  ON public.lead_messages
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_status_history" ON public.lead_status_history;
CREATE POLICY "Users with access to lead can view lead_status_history"
  ON public.lead_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_history.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_status_history" ON public.lead_status_history;
CREATE POLICY "Business members can manage lead_status_history"
  ON public.lead_status_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_status_history.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_status_history" ON public.lead_status_history;
CREATE POLICY "master can manage all lead_status_history"
  ON public.lead_status_history
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_consents" ON public.lead_consents;
CREATE POLICY "Users with access to lead can view lead_consents"
  ON public.lead_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_consents.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_consents" ON public.lead_consents;
CREATE POLICY "Business members can manage lead_consents"
  ON public.lead_consents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_consents.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_consents" ON public.lead_consents;
CREATE POLICY "master can manage all lead_consents"
  ON public.lead_consents
  FOR ALL
  USING (public.has_global_platform_role('master'));

ALTER TABLE public.lead_conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with access to lead can view lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "Users with access to lead can view lead_conversion_events"
  ON public.lead_conversion_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_conversion_events.lead_id
        AND (l.sender_user_id = auth.uid()
             OR public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
             OR public.has_tenant_admin_access(l.tenant_id))
    )
  );

DROP POLICY IF EXISTS "Business members can manage lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "Business members can manage lead_conversion_events"
  ON public.lead_conversion_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_conversion_events.lead_id
        AND public.has_business_permission(l.tenant_id, l.business_id, ARRAY['owner', 'co_owner', 'manager', 'marketing'])
    )
  );

DROP POLICY IF EXISTS "master can manage all lead_conversion_events" ON public.lead_conversion_events;
CREATE POLICY "master can manage all lead_conversion_events"
  ON public.lead_conversion_events
  FOR ALL
  USING (public.has_global_platform_role('master'));
