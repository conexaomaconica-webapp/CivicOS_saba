-- ============================================================================
-- Product Migration: Conexão Maçônica - Messaging & Event Operations Context (6.17)
-- ============================================================================
-- Outbox Pattern + DLQ (Infraestrutura assíncrona; base do INF-003/CTL-006):
-- outbox_events (registro imutável), event_deliveries, event_delivery_attempts,
-- event_consumptions, failed_event_queue (DLQ auditável) e a projeção sanitizada
-- vw_operational_dlq_sanitized.
--
-- NOTA DE CONCILIAÇÃO: Doc 02 §6.14.3 define uma versão simplificada de
-- `outbox_events` (coluna published). Esta migration implementa o modelo completo
-- do §6.17 (event sourcing + DLQ), promovendo o DDL conceitual a executável na
-- Migration Review. A versão simplificada fica superseded.
--
-- RLS na tabela base failed_event_queue (requisito do §6.17 para a view) é
-- habilitado no INF-002 (Políticas RLS), conforme split do backlog.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. outbox_events (Registro Imutável de Eventos do Sistema)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  event_version TEXT NOT NULL DEFAULT '1.0',
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INT NOT NULL DEFAULT 1,
  producer TEXT NOT NULL,
  correlation_id TEXT,
  causation_id TEXT,
  trace_id TEXT,
  actor_type TEXT, -- 'user', 'system', 'api_key'
  actor_id TEXT,   -- Referência mínima ao ator sem duplicação de PII
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, dispatched, failed
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_processing ON public.outbox_events(status, available_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON public.outbox_events(tenant_id, event_type);

-- ---------------------------------------------------------------------------
-- 2. event_deliveries (Estado Atual de Entrega por Consumidor)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  attempt_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_event_delivery_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 3. event_delivery_attempts (Histórico Imutável de Tentativas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.event_deliveries(id) ON DELETE RESTRICT,
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  attempt_number INT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- success, failed
  error_stack TEXT,
  CONSTRAINT unq_delivery_attempt_seq UNIQUE (delivery_id, attempt_number),
  CONSTRAINT chk_attempt_num_positive CHECK (attempt_number > 0),
  CONSTRAINT chk_exec_time_non_negative CHECK (execution_time_ms >= 0)
);

-- ---------------------------------------------------------------------------
-- 4. event_consumptions (Registro de Execução Concluída e Idempotência)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT NOT NULL DEFAULT 0,
  result_status TEXT NOT NULL DEFAULT 'success', -- success, skipped_idempotent
  CONSTRAINT unq_event_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 5. failed_event_queue (Dead Letter Queue — DLQ Auditável)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.failed_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.outbox_events(event_id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  consumer_name TEXT NOT NULL,
  payload_redacted JSONB NOT NULL,
  first_failed_at TIMESTAMPTZ NOT NULL,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_stack TEXT,
  retry_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_operator_action', -- requires_operator_action, replaying, discarded, resolved
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT unq_dlq_event_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- 6. Índices Operacionais Obrigatórios (poling do Worker e inspeção da DLQ)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_outbox_poll ON public.outbox_events(status, available_at, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_consumer ON public.event_deliveries(event_id, consumer_name);
CREATE INDEX IF NOT EXISTS idx_deliveries_retry ON public.event_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_attempts_delivery_seq ON public.event_delivery_attempts(delivery_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_dlq_tenant_status ON public.failed_event_queue(tenant_id, status, last_failed_at);

-- ---------------------------------------------------------------------------
-- 7. Projeção Sanitizada para Inspeção Operacional (vw_operational_dlq_sanitized)
-- Impede acesso direto de Tenant Admin às tabelas base da Outbox.
-- Avalia RLS via a tabela subjacente failed_event_queue (habilitada no INF-002).
-- ---------------------------------------------------------------------------

CREATE VIEW public.vw_operational_dlq_sanitized
WITH (security_invoker = true) AS
SELECT
  dlq.id AS dlq_id,
  dlq.event_id,
  dlq.tenant_id,
  dlq.consumer_name,
  dlq.payload_redacted,
  dlq.first_failed_at,
  dlq.last_failed_at,
  dlq.retry_count,
  dlq.status,
  dlq.resolution_notes
FROM public.failed_event_queue dlq;

-- Grants restritos à View
GRANT SELECT ON public.vw_operational_dlq_sanitized TO authenticated;
GRANT ALL ON public.vw_operational_dlq_sanitized TO service_role;
