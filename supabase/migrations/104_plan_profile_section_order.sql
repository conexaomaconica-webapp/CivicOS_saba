-- Ordem configurável das seções dos perfis públicos por plano comercial.
ALTER TABLE public.plan_payment_rules
  ADD COLUMN IF NOT EXISTS profile_section_order TEXT[] NOT NULL DEFAULT ARRAY[
    'about', 'services', 'video', 'gallery', 'benefits', 'events', 'posts'
  ]::TEXT[];

ALTER TABLE public.plan_payment_rules
  DROP CONSTRAINT IF EXISTS plan_payment_rules_profile_section_order_check;

ALTER TABLE public.plan_payment_rules
  ADD CONSTRAINT plan_payment_rules_profile_section_order_check CHECK (
    cardinality(profile_section_order) = 7
    AND profile_section_order <@ ARRAY[
      'about', 'services', 'video', 'gallery', 'benefits', 'events', 'posts'
    ]::TEXT[]
    AND 'about' = ANY(profile_section_order)
    AND 'services' = ANY(profile_section_order)
    AND 'video' = ANY(profile_section_order)
    AND 'gallery' = ANY(profile_section_order)
    AND 'benefits' = ANY(profile_section_order)
    AND 'events' = ANY(profile_section_order)
    AND 'posts' = ANY(profile_section_order)
  ) NOT VALID;

-- Ordem inicial solicitada para o Plano Acácia.
UPDATE public.plan_payment_rules
SET profile_section_order = ARRAY[
  'about', 'services', 'video', 'gallery', 'benefits', 'events', 'posts'
]::TEXT[]
WHERE plan_code = 'ouro';

COMMENT ON COLUMN public.plan_payment_rules.profile_section_order IS
  'Ordem dos blocos de conteúdo no perfil público do plano comercial.';
