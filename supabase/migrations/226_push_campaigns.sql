-- Campanhas de notificação push (comunicados do admin para o app).
-- Modos de conteúdo: somente texto, somente imagem, ou imagem + texto.
-- expires_at: prazo de validade; vira o TTL no FCM e bloqueia envio depois de vencido.
-- Acesso: somente service role (server actions do admin). Sem policies para anon/authenticated.

CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  storage_path TEXT,
  content_mode TEXT NOT NULL DEFAULT 'text' CHECK (content_mode IN ('text', 'image', 'image_text')),
  route TEXT,
  audience_type TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all', 'emails')),
  audience_emails TEXT[],
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'partial', 'failed')),
  target_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  error_details TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_campaigns_created_at ON public.push_campaigns(created_at DESC);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access push_campaigns" ON public.push_campaigns;
CREATE POLICY "Service role full access push_campaigns"
  ON public.push_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
