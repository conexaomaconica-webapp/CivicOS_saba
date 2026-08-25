-- Migration 067: Commercial Plan Attributes & Onboarding Integration

-- Extend plan_payment_rules with commercial presentation fields
ALTER TABLE public.plan_payment_rules
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS commercial_features TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Seed initial commercial titles and slogans for Bronze, Prata, Ouro
UPDATE public.plan_payment_rules
SET
  title = 'Plano Bronze',
  slogan = 'Entrada gratuita no Guia Maçônico',
  description = 'Ideal para pequenos negócios fraternos iniciando a presença digital no guia comercial.',
  is_popular = false,
  is_active = true,
  display_order = 1,
  commercial_features = ARRAY[
    'Presença básica no Guia Comercial',
    'Até 3 Fotos na Galeria',
    'Até 2 Serviços cadastrados',
    '1 Oferta/Benefício ativo',
    'Parcelamento em até 3x sem juros'
  ]
WHERE plan_code = 'bronze';

UPDATE public.plan_payment_rules
SET
  title = 'Plano Prata',
  slogan = 'Excelente visibilidade comercial e mídias',
  description = 'Recomendado para empresas estabelecidas buscando destaque fraterno e canal direto no WhatsApp.',
  is_popular = true,
  is_active = true,
  display_order = 2,
  commercial_features = ARRAY[
    'Destaque no Guia Comercial',
    'Até 6 Fotos na Galeria',
    'Até 5 Serviços cadastrados',
    'Até 3 Ofertas/Benefícios ativos',
    'Publicação de Eventos e Comunicados',
    'Parcelamento em até 6x sem juros'
  ]
WHERE plan_code = 'prata';

UPDATE public.plan_payment_rules
SET
  title = 'Plano Ouro',
  slogan = 'Máxima presença, topo do guia e analytics',
  description = 'Presença de elite para grandes parceiros com prioridade máxima de busca, mídias e analytics avançado.',
  is_popular = false,
  is_active = true,
  display_order = 3,
  commercial_features = ARRAY[
    'Topo das Buscas e Maior Destaque',
    'Até 10 Fotos na Galeria',
    'Até 10 Serviços cadastrados',
    'Até 5 Ofertas/Benefícios ativos',
    'Publicação Ilimitada de Eventos',
    'Analytics Avançado (7, 30 e 90 dias)',
    'Parcelamento em até 12x sem juros'
  ]
WHERE plan_code = 'ouro';
