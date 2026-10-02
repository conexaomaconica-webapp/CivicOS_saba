-- Migration 134: Configurações Dinâmicas de Integração de Pagamento (Asaas Sandbox & Produção)
-- Fase 8: Central de Integrações Administrativas

-- 1. Cria tabela para armazenar configurações de provedores de pagamento por tenant e ambiente
CREATE TABLE IF NOT EXISTS public.payment_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'asaas',
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  
  -- Credenciais criptografadas em repouso
  encrypted_api_key TEXT,
  encrypted_webhook_token TEXT,
  
  -- Metadados de Webhook
  webhook_id TEXT,
  webhook_url TEXT,
  
  -- Controle de ativação
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active_environment BOOLEAN NOT NULL DEFAULT false,
  
  -- Diagnóstico de conexão
  last_connection_test_at TIMESTAMPTZ,
  last_connection_test_success BOOLEAN,
  last_connection_error TEXT,
  
  -- Auditoria e rastreabilidade
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  CONSTRAINT uq_payment_provider_settings UNIQUE(tenant_id, provider, environment)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_payment_provider_settings_tenant_active 
  ON public.payment_provider_settings(tenant_id, provider, is_active_environment)
  WHERE is_active_environment IS TRUE;

-- 2. Adiciona coluna provider_environment em faturas e tentativas de pagamento para rastreamento de origem
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS provider_environment TEXT CHECK (provider_environment IN ('sandbox', 'production'));

ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS provider_environment TEXT CHECK (provider_environment IN ('sandbox', 'production'));

-- 3. Habilita Row Level Security (RLS)
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS estritas:
-- Apenas service_role e admins da plataforma podem visualizar ou manipular credenciais
DROP POLICY IF EXISTS "Platform admins can view payment provider settings" ON public.payment_provider_settings;
CREATE POLICY "Platform admins can view payment provider settings"
  ON public.payment_provider_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('master', 'admin', 'tenant_admin')
    )
  );

DROP POLICY IF EXISTS "Platform admins can modify payment provider settings" ON public.payment_provider_settings;
CREATE POLICY "Platform admins can modify payment provider settings"
  ON public.payment_provider_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('master', 'admin')
    )
  );

REVOKE ALL ON public.payment_provider_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_provider_settings TO authenticated, service_role;
