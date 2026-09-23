-- Permite definir a apresentação de cada plano/condecoração no cabeçalho público.
ALTER TABLE public.institutional_recognitions
  ADD COLUMN IF NOT EXISTS header_display TEXT NOT NULL DEFAULT 'badge'
  CHECK (header_display IN ('badge', 'horizontal_seal'));

-- O admin aceita SVG para os selos; mantém os formatos já suportados pelo bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'business-assets';

NOTIFY pgrst, 'reload schema';
