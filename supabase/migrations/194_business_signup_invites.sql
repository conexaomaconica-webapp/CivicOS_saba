-- 194 - Convite de cadastro: link para o cliente preencher os dados da empresa, com validação da equipe depois.
--
-- Fluxo: a equipe gera o convite -> o cliente preenche um formulário limitado (sem preço, contrato, pagamento ou
-- publicação) -> os dados ficam guardados no convite (status 'submitted') -> a equipe confere, escolhe o plano e cria o
-- cadastro (conta do responsável + empresa em rascunho + vínculo maçônico pendente) -> a contratação e o pagamento seguem o
-- fluxo atual, que só avança depois da conferência (máquina de estados de commercial_status).
--
-- Os dados enviados NÃO entram em businesses antes da conferência (businesses exige um dono autenticado).
-- O token nunca é guardado: só o hash SHA-256. A tabela não tem política de acesso: leitura e escrita só pelo servidor
-- (chave de serviço), depois de checar admin de plataforma ou o token do convite.

CREATE TABLE IF NOT EXISTS public.business_signup_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  invited_name TEXT,
  invited_email TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'submitted', 'converted', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  submitted_data JSONB,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  converted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.business_signup_invites ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_business_signup_invites_tenant_status
  ON public.business_signup_invites (tenant_id, status, created_at DESC);

ALTER TABLE public.business_signup_invites ENABLE ROW LEVEL SECURITY;
-- Sem políticas de propósito: anon/authenticated não leem nem gravam; o servidor usa a chave de serviço.
REVOKE ALL ON public.business_signup_invites FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
