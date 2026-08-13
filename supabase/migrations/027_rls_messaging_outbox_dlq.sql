-- ============================================================================
-- Product Migration: Conexão Maçônica - INF-002 RLS: Messaging & Event Operations (016)
-- ============================================================================
-- Outbox/DLQ: acesso exclusivo via service_role (worker) e master. A única via
-- de acesso para autenticados é a projeção sanitizada vw_operational_dlq_sanitized
-- (CTL-006), que avalia RLS via a tabela base failed_event_queue (security_invoker).
--
-- Requisito obrigatório do Doc 02 §6.17: failed_event_queue com RLS habilitada
-- E FORÇADA (FORCE), impedindo acesso direto do owner sem política.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- outbox_events (registro imutável de eventos)
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage outbox_events" ON public.outbox_events;
CREATE POLICY "master can manage outbox_events"
  ON public.outbox_events
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_deliveries" ON public.event_deliveries;
CREATE POLICY "master can manage event_deliveries"
  ON public.event_deliveries
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_delivery_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_delivery_attempts" ON public.event_delivery_attempts;
CREATE POLICY "master can manage event_delivery_attempts"
  ON public.event_delivery_attempts
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- event_consumptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master can manage event_consumptions" ON public.event_consumptions;
CREATE POLICY "master can manage event_consumptions"
  ON public.event_consumptions
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- ---------------------------------------------------------------------------
-- failed_event_queue (DLQ) — RLS habilitada e forçada
-- ---------------------------------------------------------------------------

ALTER TABLE public.failed_event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_event_queue FORCE ROW LEVEL SECURITY;

-- Habilita a projeção sanitizada vw_operational_dlq_sanitized para tenant admins
-- no escopo do próprio tenant (security_invoker avalia esta policy).
DROP POLICY IF EXISTS "tenant_admin can view failed_event_queue of own tenant" ON public.failed_event_queue;
CREATE POLICY "tenant_admin can view failed_event_queue of own tenant"
  ON public.failed_event_queue
  FOR SELECT
  USING (public.has_tenant_admin_access(tenant_id));

DROP POLICY IF EXISTS "master can manage failed_event_queue" ON public.failed_event_queue;
CREATE POLICY "master can manage failed_event_queue"
  ON public.failed_event_queue
  FOR ALL
  USING (public.has_global_platform_role('master'));

-- Privilégio base necessário para a view security_invoker funcionar em
-- autenticados (supabase sem auto_expose_new_tables não concede por padrão).
-- A sanitização é garantida pela projeção da view (payload_redacted, sem
-- error_stack/resolution internas) + RLS forçada (apenas linhas do próprio tenant).
GRANT SELECT ON public.failed_event_queue TO authenticated;
