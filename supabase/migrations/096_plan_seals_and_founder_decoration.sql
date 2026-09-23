-- Novo catálogo: selos comerciais para todos os planos e Pedra Fundamental
-- como condecoração histórica de fundadores. O legado Coluna de Honra é
-- desativado sem apagar registros históricos.
UPDATE public.institutional_recognitions
SET is_active = false, updated_at = NOW()
WHERE key = 'coluna_de_honra';

UPDATE public.institutional_recognitions
SET title = 'Pedra Fundamental',
    description = 'Condecoração para empresas fundadoras da Conexão Maçônica.',
    tooltip = 'Condecoração de fundador, independente do plano comercial e sem natureza de benefício ou entitlement.',
    priority_order = 1,
    updated_at = NOW()
WHERE key = 'pedra_fundamental';

UPDATE public.institutional_recognitions
SET title = 'Selo Acácia',
    description = 'Identificação comercial das empresas ativas no Plano Acácia.',
    tooltip = 'Exibido para anunciantes ativos no Plano Acácia.',
    priority_order = 2,
    updated_at = NOW()
WHERE key = 'selo_ouro';

INSERT INTO public.institutional_recognitions
  (key, title, description, tooltip, seal_url, compact_seal_url, priority_order, is_active)
VALUES
  ('selo_prata', 'Selo Compasso', 'Identificação comercial das empresas ativas no Plano Compasso.', 'Exibido para anunciantes ativos no Plano Compasso.', '/selos/plano-prata.svg', '/selos/plano-prata.svg', 3, true),
  ('selo_bronze', 'Selo Esquadro', 'Identificação comercial das empresas ativas no Plano Esquadro.', 'Exibido para anunciantes ativos no Plano Esquadro.', '/selos/plano-bronze.svg', '/selos/plano-bronze.svg', 4, true)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  tooltip = EXCLUDED.tooltip,
  seal_url = EXCLUDED.seal_url,
  compact_seal_url = EXCLUDED.compact_seal_url,
  priority_order = EXCLUDED.priority_order,
  is_active = true,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
