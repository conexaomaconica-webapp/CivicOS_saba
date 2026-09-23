-- Categorias globais iniciais do Guia de Negocios.
-- Idempotente: preserva categorias ja existentes com o mesmo slug.

INSERT INTO public.categories (tenant_id, parent_id, name, slug, icon, description, display_order, is_active)
SELECT NULL, NULL, seed.name, seed.slug, seed.icon, seed.description, seed.display_order, true
FROM (VALUES
  ('Negocios', 'negocios', 'briefcase', 'Empresas, comercio e oportunidades de negocios.', 10),
  ('Servicos', 'servicos', 'servicos', 'Prestadores e empresas de servicos.', 20),
  ('Profissionais', 'profissionais', 'award', 'Profissionais liberais e especialistas.', 30)
) AS seed(name, slug, icon, description, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories category
  WHERE category.tenant_id IS NULL AND category.slug = seed.slug
);

INSERT INTO public.categories (tenant_id, parent_id, name, slug, icon, description, display_order, is_active)
SELECT
  NULL,
  parent.id,
  seed.name,
  seed.slug,
  seed.icon,
  seed.description,
  seed.display_order,
  true
FROM (VALUES
  ('negocios', 'Comercio e Varejo', 'comercio-varejo', 'store', 'Lojas, distribuidores e comercio em geral.', 11),
  ('negocios', 'Alimentacao', 'alimentacao', 'utensils', 'Restaurantes, mercados, cafeterias e alimentos.', 12),
  ('negocios', 'Construcao e Imoveis', 'construcao-imoveis', 'home', 'Construcao civil, arquitetura e mercado imobiliario.', 13),
  ('negocios', 'Automotivo', 'automotivo', 'car', 'Veiculos, oficinas, pecas e servicos automotivos.', 14),
  ('servicos', 'Tecnologia', 'tecnologia', 'phone', 'Software, suporte, telecomunicacoes e servicos digitais.', 21),
  ('servicos', 'Eventos e Cultura', 'eventos-cultura', 'palette', 'Eventos, producao cultural e entretenimento.', 22),
  ('servicos', 'Turismo e Viagens', 'turismo-viagens', 'globe', 'Hospedagem, turismo, transporte e viagens.', 23),
  ('servicos', 'Seguranca', 'seguranca', 'shield', 'Seguranca patrimonial, tecnologia e consultoria.', 24),
  ('profissionais', 'Saude', 'saude', 'saude', 'Medicos, dentistas, terapeutas e profissionais de saude.', 31),
  ('profissionais', 'Juridico', 'juridico', 'juridico', 'Advogados, escritorios e consultoria juridica.', 32),
  ('profissionais', 'Consultoria', 'consultoria', 'briefcase', 'Consultores, contadores e especialistas empresariais.', 33),
  ('profissionais', 'Beleza e Bem-estar', 'beleza-bem-estar', 'sparkles', 'Estetica, beleza, atividade fisica e bem-estar.', 34)
) AS seed(parent_slug, name, slug, icon, description, display_order)
JOIN public.categories parent
  ON parent.tenant_id IS NULL AND parent.slug = seed.parent_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories category
  WHERE category.tenant_id IS NULL AND category.slug = seed.slug
);
