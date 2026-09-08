-- Migration 080: Institutional Recognitions Schema, Grants & Policies
-- Creates public.institutional_recognitions table for catalog, seal graphics and tooltips.

CREATE TABLE IF NOT EXISTS public.institutional_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tooltip TEXT,
    seal_url TEXT NOT NULL,
    compact_seal_url TEXT NOT NULL,
    priority_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.institutional_recognitions ENABLE ROW LEVEL SECURITY;

-- Explicit Role Grants (Obrigatório para o PostgREST expor a tabela)
GRANT ALL ON TABLE public.institutional_recognitions TO authenticated;
GRANT ALL ON TABLE public.institutional_recognitions TO service_role;
GRANT SELECT ON TABLE public.institutional_recognitions TO anon;

-- 1. Public read policy for active recognitions
DROP POLICY IF EXISTS "Public read institutional_recognitions" ON public.institutional_recognitions;
CREATE POLICY "Public read institutional_recognitions"
ON public.institutional_recognitions
FOR SELECT
USING (true);

-- 2. Platform Admin write policy (Fallback permissive para authenticated em ambiente admin)
DROP POLICY IF EXISTS "Admin write institutional_recognitions" ON public.institutional_recognitions;
CREATE POLICY "Admin write institutional_recognitions"
ON public.institutional_recognitions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed default recognitions if table is empty
INSERT INTO public.institutional_recognitions (id, key, title, description, tooltip, seal_url, compact_seal_url, priority_order, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000101'::uuid, 'pedra_fundamental', 'Selo Pedra Fundamental (10/10)', 'Reconhecimento histórico/institucional permanente dos 10 primeiros apoiadores da rede Conexão Maçônica.', 'Concedido exclusivamente aos 10 primeiros apoiadores históricos da plataforma.', '/selos/pedra-fundamental.svg', '/selos/pedra-fundamental-compact.svg', 1, true),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'coluna_de_honra', 'Coluna de Honra (Empresa Fundadora)', 'Membro fundador e destaque de mérito e contribuição exemplar na fraternidade.', 'Reconhecimento institucional aos membros fundadores da comunidade.', '/selos/coluna-honra.svg', '/selos/coluna-honra-compact.svg', 2, true),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'selo_ouro', 'Selo Anunciante Ouro', 'Reconhecimento e presença comercial de máxima distinção para empresas do Plano Ouro.', 'Concedido a todos os anunciantes ativos no Plano Ouro.', '/selos/plano-ouro.svg', '/selos/plano-ouro-compact.svg', 3, true)
ON CONFLICT (key) DO NOTHING;

-- Recarregar cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
