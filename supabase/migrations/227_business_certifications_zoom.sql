-- Zoom por certificação (ISO etc.): amplia a arte dentro do quadro fixo exibido no cabeçalho e no card.
-- 100 = tamanho original; admin ajusta de 100 a 300 no Prontuário 360.
ALTER TABLE public.business_certifications
  ADD COLUMN IF NOT EXISTS zoom_percent INT NOT NULL DEFAULT 100;

ALTER TABLE public.business_certifications
  DROP CONSTRAINT IF EXISTS business_certifications_zoom_percent_check;
ALTER TABLE public.business_certifications
  ADD CONSTRAINT business_certifications_zoom_percent_check CHECK (zoom_percent BETWEEN 100 AND 300);
