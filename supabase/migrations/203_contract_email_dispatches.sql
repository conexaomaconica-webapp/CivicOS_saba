-- 203 - Tabela de controle de envios de e-mail de contratos (Hostinger Mail API e provedores desacoplados)
--
-- Registra as tentativas de envio, controle de concorrência, idempotência e estados de entrega:
-- processing: envio em andamento (bloqueio de concorrência ativo)
-- accepted: provedor aceitou a mensagem para entrega
-- failed: provedor rejeitou explicitamente a mensagem (ex.: erro 4xx, rejeição definitiva)
-- unknown: resultado ambíguo (timeout, falha de rede ou 5xx). O token anterior é preservado e não há reenvio automático.

CREATE TABLE IF NOT EXISTS public.contract_email_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  dispatch_status TEXT NOT NULL CHECK (dispatch_status IN ('processing', 'accepted', 'failed', 'unknown')),
  provider TEXT NOT NULL DEFAULT 'hostinger',
  provider_message_id TEXT,
  error_message TEXT,
  token_id UUID REFERENCES public.business_onboarding_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

-- Índices para controle de concorrência e histórico
CREATE INDEX IF NOT EXISTS idx_contract_email_dispatches_contract_status
  ON public.contract_email_dispatches (contract_id, dispatch_status);

CREATE INDEX IF NOT EXISTS idx_contract_email_dispatches_business
  ON public.contract_email_dispatches (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_email_dispatches_idempotency
  ON public.contract_email_dispatches (idempotency_key);

-- RLS: Isolamento estrito conforme AGENTS.md (apenas service_role)
ALTER TABLE public.contract_email_dispatches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contract_email_dispatches FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.contract_email_dispatches TO service_role;

-- Comentários descritivos
COMMENT ON TABLE public.contract_email_dispatches IS 'Histórico, controle de concorrência e idempotência dos envios de contratos por e-mail.';
COMMENT ON COLUMN public.contract_email_dispatches.dispatch_status IS 'Estado do envio: processing (em voo), accepted (aceito), failed (rejeitado), unknown (timeout/erro de rede).';

NOTIFY pgrst, 'reload schema';
