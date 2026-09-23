-- Catalogo inicial global de categorias da Conexao Maconica.
-- Todas as novas linhas nascem inativas e nao sao publicadas automaticamente.
-- Idempotente: categorias globais com o mesmo slug sao preservadas, inclusive status.

INSERT INTO public.categories (
  tenant_id, parent_id, name, slug, icon, description, display_order, is_active
)
SELECT
  NULL, NULL, seed.name, seed.slug, seed.icon, seed.description, seed.display_order, false
FROM (VALUES
  ('Negocios e Empreendedorismo', 'negocios-empreendedorismo', 'briefcase', 'Empresas, empreendedores, franquias e oportunidades de negocio.', 100),
  ('Comercio e Varejo', 'comercio-varejo', 'store', 'Lojas, distribuidores, atacadistas e varejistas.', 110),
  ('Industria e Fabricacao', 'industria-fabricacao', 'building', 'Industrias, fabricantes e fornecedores.', 120),
  ('Representacao Comercial', 'representacao-comercial', 'hand', 'Representantes comerciais e intermediacao de negocios.', 130),
  ('Consultoria Empresarial', 'consultoria-empresarial', 'briefcase', 'Consultoria de gestao, estrategia e processos.', 140),
  ('Contabilidade e Financas', 'contabilidade-financas', 'landmark', 'Contadores, assessorias financeiras e planejamento tributario.', 150),
  ('Advocacia e Servicos Juridicos', 'advocacia-servicos-juridicos', 'juridico', 'Advogados, escritorios e consultoria juridica.', 160),
  ('Medicina e Saude', 'medicina-saude', 'saude', 'Medicos, clinicas, hospitais e servicos de saude.', 170),
  ('Odontologia', 'odontologia', 'saude', 'Dentistas, clinicas odontologicas e laboratorios.', 180),
  ('Psicologia e Terapias', 'psicologia-terapias', 'heart', 'Psicologos, terapeutas e profissionais de cuidado emocional.', 190),
  ('Nutricao e Qualidade de Vida', 'nutricao-qualidade-vida', 'heart', 'Nutricionistas e profissionais de qualidade de vida.', 200),
  ('Engenharia e Arquitetura', 'engenharia-arquitetura', 'building', 'Engenheiros, arquitetos, projetistas e consultores tecnicos.', 210),
  ('Construcao Civil', 'construcao-civil', 'home', 'Construtoras, reformas, materiais e servicos de obra.', 220),
  ('Imobiliarias e Corretores', 'imobiliarias-corretores', 'home', 'Imobiliarias, corretores e administracao de imoveis.', 230),
  ('Tecnologia da Informacao', 'tecnologia-informacao', 'phone', 'Software, infraestrutura, suporte e transformacao digital.', 240),
  ('Marketing e Comunicacao', 'marketing-comunicacao', 'sparkles', 'Marketing, publicidade, design e comunicacao.', 250),
  ('Educacao e Treinamentos', 'educacao-treinamentos', 'award', 'Escolas, professores, cursos e capacitacao profissional.', 260),
  ('Recursos Humanos', 'recursos-humanos', 'hand', 'Recrutamento, desenvolvimento e gestao de pessoas.', 270),
  ('Seguranca e Monitoramento', 'seguranca-monitoramento', 'shield', 'Seguranca patrimonial, monitoramento e tecnologia de protecao.', 280),
  ('Transporte e Logistica', 'transporte-logistica', 'car', 'Transportadoras, entregas, armazenagem e logistica.', 290),
  ('Automoveis e Oficinas', 'automoveis-oficinas', 'car', 'Veiculos, oficinas, autopecas e servicos automotivos.', 300),
  ('Alimentacao e Gastronomia', 'alimentacao-gastronomia', 'utensils', 'Restaurantes, mercados, padarias e fornecedores de alimentos.', 310),
  ('Hotelaria e Turismo', 'hotelaria-turismo', 'globe', 'Hoteis, pousadas, agencias e experiencias turisticas.', 320),
  ('Eventos e Entretenimento', 'eventos-entretenimento', 'palette', 'Eventos, producao, fotografia, musica e entretenimento.', 330),
  ('Beleza e Estetica', 'beleza-estetica', 'sparkles', 'Saloes, estetica, cosmeticos e cuidados pessoais.', 340),
  ('Esportes e Atividade Fisica', 'esportes-atividade-fisica', 'heart', 'Academias, treinadores e atividades esportivas.', 350),
  ('Servicos Residenciais', 'servicos-residenciais', 'home', 'Manutencao, limpeza, reparos e servicos para residencias.', 360),
  ('Servicos Tecnicos', 'servicos-tecnicos', 'servicos', 'Instalacao, manutencao e assistencia tecnica especializada.', 370),
  ('Agronegocio', 'agronegocio', 'compass', 'Produtores, fornecedores e servicos para o agronegocio.', 380),
  ('Outros Profissionais e Servicos', 'outros-profissionais-servicos', 'tag', 'Demais profissionais, empresas e prestadores de servicos.', 390)
) AS seed(name, slug, icon, description, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories category
  WHERE category.tenant_id IS NULL
    AND category.slug = seed.slug
);
