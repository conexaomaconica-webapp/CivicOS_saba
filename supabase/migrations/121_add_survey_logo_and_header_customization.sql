-- Migration 121: Adiciona campos de customização de marca (logo_url, show_logo) na tabela de pesquisas (surveys)
-- Permite exibir a logomarca oficial da Conexão Maçônica ou logo customizada ao invés de apenas texto

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logoconexao_red.png',
  ADD COLUMN IF NOT EXISTS show_logo BOOLEAN NOT NULL DEFAULT true;

-- Atualiza registros existentes para garantir que pesquisas já criadas tenham a logomarca ativada por padrão
UPDATE public.surveys
SET 
  logo_url = COALESCE(logo_url, '/logoconexao_red.png'),
  show_logo = COALESCE(show_logo, true);

COMMENT ON COLUMN public.surveys.logo_url IS 'URL da logomarca a ser exibida no cabeçalho da pesquisa (padrão: /logoconexao_red.png)';
COMMENT ON COLUMN public.surveys.show_logo IS 'Indica se a pesquisa deve exibir a logomarca (true) ou apenas o badge textual (false)';
