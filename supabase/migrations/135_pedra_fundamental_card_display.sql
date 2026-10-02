-- Migration 135: Formato de Exibição da Pedra Fundamental nos Cards do Guia (Selo Normal, Selo Horizontal ou Badge em Formato de Texto)

-- 1. Coluna de exibição nos cards na tabela do catálogo institucional
ALTER TABLE public.institutional_recognitions
  ADD COLUMN IF NOT EXISTS card_display TEXT NOT NULL DEFAULT 'circular_seal'
  CHECK (card_display IN ('circular_seal', 'horizontal_seal', 'badge_text'));

COMMENT ON COLUMN public.institutional_recognitions.card_display IS 
  'Formato de apresentação do selo nos cards de empresas do Guia: circular_seal (Selo Normal Circular), horizontal_seal (Selo Horizontal) ou badge_text (Badge em formato de texto).';

-- 2. Coluna opcional de override específico por empresa na tabela businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS pedra_fundamental_card_display TEXT DEFAULT NULL
  CHECK (pedra_fundamental_card_display IS NULL OR pedra_fundamental_card_display IN ('circular_seal', 'horizontal_seal', 'badge_text'));

COMMENT ON COLUMN public.businesses.pedra_fundamental_card_display IS 
  'Configuração de override específico por anunciante para o formato do selo Pedra Fundamental no card. Se NULL, adota a governança global de institutional_recognitions.';

-- 3. Notificar recarregamento do schema PostgREST
NOTIFY pgrst, 'reload schema';
