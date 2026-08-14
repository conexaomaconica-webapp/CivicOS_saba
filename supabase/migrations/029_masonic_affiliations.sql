-- ============================================================================
-- ADV-001b (DOMÍNIO MAÇÔNICO): Masonic affiliation of the responsible person
-- ============================================================================
-- Coleta, no onboarding do anunciante (W1), o vínculo maçônico declarado pelo
-- responsável: irmão maçom (CIMB + loja + ativo), cunhada (marido maçom),
-- DeMolay / Filha de Jó (capítulo) ou ausência de vínculo.
-- Persistido por usuário (1:1) e consumido na moderação/validação do selo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.masonic_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('mason', 'mason_wife', 'demolay', 'job_daughter', 'none')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  cimb_code TEXT,                -- CIMB (Carteira de Identificação Maçônica do Brasil) — irmão maçom
  lodge_name TEXT,               -- Loja maçônica — irmão maçom
  chapter_name TEXT,             -- Capítulo DeMolay / Beth-El (Filha de Jó)
  spouse_mason_name TEXT,        -- Nome do marido maçom — cunhada
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_masonic_affiliations_status
  ON public.masonic_affiliations (status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.masonic_affiliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Person can view own masonic affiliation" ON public.masonic_affiliations;
CREATE POLICY "Person can view own masonic affiliation"
  ON public.masonic_affiliations
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Person can manage own masonic affiliation" ON public.masonic_affiliations;
CREATE POLICY "Person can manage own masonic affiliation"
  ON public.masonic_affiliations
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_admin can view masonic affiliations" ON public.masonic_affiliations;
CREATE POLICY "tenant_admin can view masonic affiliations"
  ON public.masonic_affiliations
  FOR SELECT
  USING (
    public.has_tenant_admin_access(
      (SELECT profiles.tenant_id FROM public.profiles WHERE profiles.id = user_id)
    )
  );

DROP POLICY IF EXISTS "master can view masonic affiliations" ON public.masonic_affiliations;
CREATE POLICY "master can view masonic affiliations"
  ON public.masonic_affiliations
  FOR SELECT
  USING (public.has_global_platform_role('master'));