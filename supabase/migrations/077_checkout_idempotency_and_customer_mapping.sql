-- Migration 077: Checkout Idempotency, Financial Freeze & Provider Customer Mapping
-- Bloco 7 — Etapa 2A (Motor de Checkout Canônico Server-Side)

-- 1. Congelamento de plan_version_id em faturas (invoices)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS plan_version_id UUID REFERENCES public.plan_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

-- 2. Idempotency key única para tentativas de pagamento (payment_attempts)
ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_idempotency 
  ON public.payment_attempts(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 3. Mapeamento de Customer por Empresa (provider-agnostic)
CREATE TABLE IF NOT EXISTS public.payment_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_customers_biz_provider UNIQUE (tenant_id, business_id, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_payment_customers_biz ON public.payment_customers(tenant_id, business_id);

-- RLS & Grants para public.payment_customers
ALTER TABLE public.payment_customers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_customers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_customers TO service_role;
