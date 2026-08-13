-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Analytics & Audit (014)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs (trilha de auditoria — acesso operacional restrito)
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin can view audit_logs of tenant" ON public.audit_logs;
CREATE POLICY "tenant_admin can view audit_logs of tenant"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all audit_logs" ON public.audit_logs;
CREATE POLICY "master can manage all audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- analytics_events (telemetria pseudonimizada)
-- ---------------------------------------------------------------------------

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view analytics_events of own business" ON public.analytics_events;
CREATE POLICY "Business members can view analytics_events of own business"
  ON public.analytics_events
  FOR SELECT
  USING (
    business_id IS NOT NULL
    AND public.has_business_permission(tenant_id, business_id, ARRAY['owner', 'co_owner', 'manager', 'finance', 'marketing', 'support', 'viewer'])
  );

DROP POLICY IF EXISTS "tenant_admin can view analytics_events of tenant" ON public.analytics_events;
CREATE POLICY "tenant_admin can view analytics_events of tenant"
  ON public.analytics_events
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage all analytics_events" ON public.analytics_events;
CREATE POLICY "master can manage all analytics_events"
  ON public.analytics_events
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- business_metric_rollups (métricas agregadas — leitura pública)
-- ---------------------------------------------------------------------------

ALTER TABLE public.business_metric_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view metric_rollups of published businesses" ON public.business_metric_rollups;
CREATE POLICY "Public can view metric_rollups of published businesses"
  ON public.business_metric_rollups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_metric_rollups.business_id
        AND b.tenant_id = public.current_tenant_id()
        AND b.publication_status = 'published'
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_admin can manage business_metric_rollups" ON public.business_metric_rollups;
CREATE POLICY "tenant_admin can manage business_metric_rollups"
  ON public.business_metric_rollups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_metric_rollups.business_id
        AND public.has_tenant_admin_access(b.tenant_id)
    )
  );

DROP POLICY IF EXISTS "master can manage all business_metric_rollups" ON public.business_metric_rollups;
CREATE POLICY "master can manage all business_metric_rollups"
  ON public.business_metric_rollups
  FOR ALL
  USING (public.has_global_platform_role('master'));
