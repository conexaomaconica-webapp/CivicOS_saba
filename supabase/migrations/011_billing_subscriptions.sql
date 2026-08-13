-- ============================================================================
-- Product Migration: Conexão Maçônica - Billing & Subscriptions Context (6.7)
-- ============================================================================
-- Planos e assinaturas: plans, plan_versions, subscriptions, subscription_periods,
-- invoices, invoice_items, invoice_status_history, payments, payment_refunds,
-- financial_adjustments, payment_attempts, payment_provider_events.
-- Modelo ADR-002: assinatura contínua lógica + ciclos explícitos (períodos),
-- contrato restrito a contract_term = 'annual' e gateway neutro (provider_code).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. plans - Catálogo abstrato de ofertas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plans_code_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON public.plans(tenant_id);

CREATE OR REPLACE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. plan_versions - Versões imutáveis de preço e regras
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  price_annual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  features_summary JSONB NOT NULL DEFAULT '{}',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_versions UNIQUE (plan_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plan_versions_plan ON public.plan_versions(plan_id);

-- ---------------------------------------------------------------------------
-- 3. subscriptions - Assinaturas de empresas (contrato anual desacoplado)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  plan_version_id UUID NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  contract_term TEXT NOT NULL DEFAULT 'annual' CHECK (contract_term IN ('annual')),
  payment_schedule TEXT NOT NULL DEFAULT 'lump_sum' CHECK (payment_schedule IN ('lump_sum', 'installments')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_subscriptions_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON public.subscriptions(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. subscription_periods - Ciclos explícitos da assinatura
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscription_periods_id_tenant UNIQUE (tenant_id, id),
  CONSTRAINT fk_sub_periods_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES public.subscriptions(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_periods_sub ON public.subscription_periods(tenant_id, subscription_id);

-- ---------------------------------------------------------------------------
-- 5. invoices - Faturas vinculadas ao período de assinatura
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_period_id UUID REFERENCES public.subscription_periods(id) ON DELETE SET NULL,
  business_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'overdue')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_invoices_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(tenant_id, business_id);

CREATE OR REPLACE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 6. invoice_items & invoice_status_history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice ON public.invoice_status_history(invoice_id);

-- ---------------------------------------------------------------------------
-- 7. payments, payment_refunds & financial_adjustments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'bank_slip', 'manual_transfer')),
  provider_code TEXT NOT NULL, -- Neutro (ex: 'asaas', 'stripe', 'manual')
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payments_provider_tx UNIQUE (provider_code, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON public.payment_refunds(payment_id);

CREATE TABLE IF NOT EXISTS public.financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  type TEXT NOT NULL CHECK (type IN ('credit_grant', 'debit_adjustment', 'waiver')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fin_adj_business FOREIGN KEY (tenant_id, business_id) REFERENCES public.businesses(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_business ON public.financial_adjustments(tenant_id, business_id);

-- ---------------------------------------------------------------------------
-- 8. payment_attempts & payment_provider_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
  error_code TEXT,
  error_message TEXT,
  payload_sent JSONB,
  response_received JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice ON public.payment_attempts(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_provider_events UNIQUE (provider_code, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_events_processed ON public.payment_provider_events(provider_code, processed, created_at);
