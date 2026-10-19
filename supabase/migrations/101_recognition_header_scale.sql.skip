-- Suporte à opção de ajustar a escala do selo no cabeçalho público.
ALTER TABLE public.institutional_recognitions
  ADD COLUMN IF NOT EXISTS header_scale INTEGER NOT NULL DEFAULT 100;

NOTIFY pgrst, 'reload schema';
