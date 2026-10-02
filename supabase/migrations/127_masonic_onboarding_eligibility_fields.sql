-- Migration 127: Add Masonic Eligibility Fields to business_masonic_links
-- CivicOS SABA / Conexão Maçônica
-- Separação canônica entre relação empresarial (link_type) e origem da elegibilidade maçônica (eligibility_type)

-- 1. Novos campos de elegibilidade maçônica
ALTER TABLE public.business_masonic_links
ADD COLUMN IF NOT EXISTS eligibility_type VARCHAR(30);

ALTER TABLE public.business_masonic_links
ADD COLUMN IF NOT EXISTS reference_mason_name VARCHAR(180);

ALTER TABLE public.business_masonic_links
ADD COLUMN IF NOT EXISTS reference_mason_cim VARCHAR(80);

ALTER TABLE public.business_masonic_links
ADD COLUMN IF NOT EXISTS family_relationship VARCHAR(80);

ALTER TABLE public.business_masonic_links
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Constraint CHECK para os 3 cenários de elegibilidade
ALTER TABLE public.business_masonic_links
DROP CONSTRAINT IF EXISTS business_masonic_links_eligibility_type_check;

ALTER TABLE public.business_masonic_links
ADD CONSTRAINT business_masonic_links_eligibility_type_check
CHECK (
  eligibility_type IS NULL
  OR eligibility_type IN (
    'mason',
    'mason_spouse',
    'mason_family'
  )
);
