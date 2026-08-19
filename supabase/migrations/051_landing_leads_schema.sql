-- ----------------------------------------------------------------------------
-- MIGRATION 051: TABELA CANÔNICA DE CAPTAÇÃO DE LEADS DA LANDING PAGE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.landing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city_state TEXT NOT NULL,
  interested_plan TEXT NOT NULL DEFAULT 'ouro_founder',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para buscas administrativas por tenant e status
CREATE INDEX IF NOT EXISTS idx_landing_leads_tenant_status 
  ON public.landing_leads (tenant_id, status, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- Politica 1: Inserção pública permitida para visitantes anônimos e autenticados
DROP POLICY IF EXISTS "Anyone can submit a landing lead" ON public.landing_leads;
CREATE POLICY "Anyone can submit a landing lead"
  ON public.landing_leads FOR INSERT
  WITH CHECK (true);

-- Politica 2: Leitura e consulta apenas para admins da plataforma e membros do tenant
DROP POLICY IF EXISTS "Members and admins can view landing leads" ON public.landing_leads;
CREATE POLICY "Members and admins can view landing leads"
  ON public.landing_leads FOR SELECT
  USING (
    public._is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = landing_leads.tenant_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage landing leads" ON public.landing_leads;
CREATE POLICY "Admins can manage landing leads"
  ON public.landing_leads FOR ALL
  USING (
    public._is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = landing_leads.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('admin', 'owner')
    )
  );
