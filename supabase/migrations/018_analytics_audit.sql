-- ============================================================================
-- Product Migration: Conexão Maçônica - Analytics & Audit Context (6.14)
-- ============================================================================
-- audit_logs, analytics_events (telemetria pseudonimizada), business_metric_rollups.
-- NOTA: outbox_events (6.14.3) é criado na migration 016 (Messaging & Event
-- Operations Context — 6.17), que define o modelo completo de mensageria com
-- DLQ e projeção sanitizada. A versão simplificada 6.14.3 é superseded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. audit_logs - Trilha de auditoria
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  session_evidence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON public.audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. analytics_events & business_metric_rollups
-- Telemetria pseudonimizada (sem fixar algoritmo SHA-256 prematuramente).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  pseudonymous_subject_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_business_date ON public.analytics_events(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_event ON public.analytics_events(tenant_id, event_name, created_at);

CREATE TABLE IF NOT EXISTS public.business_metric_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  phone_views INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_business_metric_date UNIQUE (business_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_business_metric_rollups_date ON public.business_metric_rollups(business_id, metric_date);
