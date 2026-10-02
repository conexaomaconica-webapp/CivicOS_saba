-- ============================================================================
-- Migration 125: Add max_quota to institutional_recognitions
-- Permite configurar dinamicamente o limite de concessões da Pedra Fundamental
-- ============================================================================

ALTER TABLE public.institutional_recognitions 
ADD COLUMN IF NOT EXISTS max_quota INTEGER DEFAULT 50;

COMMENT ON COLUMN public.institutional_recognitions.max_quota IS 'Cota máxima de concessões permitidas para a honraria institucional';

-- Atualiza a Pedra Fundamental para cota padrão de 50 empresas (ajustável pelo admin)
UPDATE public.institutional_recognitions
SET max_quota = 50
WHERE key = 'pedra_fundamental' AND (max_quota IS NULL OR max_quota = 10);

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
