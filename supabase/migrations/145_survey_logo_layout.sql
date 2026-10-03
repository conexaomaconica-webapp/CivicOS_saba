-- Controles de tamanho e alinhamento da logomarca no cabeçalho público.
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS logo_size TEXT NOT NULL DEFAULT 'medium'
    CHECK (logo_size IN ('small', 'medium', 'large', 'full')),
  ADD COLUMN IF NOT EXISTS logo_position TEXT NOT NULL DEFAULT 'center'
    CHECK (logo_position IN ('left', 'center', 'right'));
