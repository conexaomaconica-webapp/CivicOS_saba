-- ==============================================================================
-- MIGRATION 117: SURVEYS BUILDER AND RESPONSE ENGINE
-- Conexão Maçônica / CivicOS SABA - Módulo de Pesquisas & Form Builder Dinâmico
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PESQUISAS (surveys)
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  current_version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SNAPSHOTS DE VERSÃO DA PESQUISA (survey_versions)
CREATE TABLE IF NOT EXISTS public.survey_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schema_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT survey_versions_survey_version_key UNIQUE (survey_id, version_number)
);

-- 3. BLOCOS / SEÇÕES DA PESQUISA (survey_blocks)
CREATE TABLE IF NOT EXISTS public.survey_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PERGUNTAS DA PESQUISA (survey_questions)
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.survey_blocks(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  help_text TEXT,
  question_type TEXT NOT NULL CHECK (
    question_type IN (
      'short_text',
      'long_text',
      'single_choice',
      'multiple_choice',
      'dropdown',
      'rating',
      'boolean',
      'date'
    )
  ),
  order_index INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_other BOOLEAN NOT NULL DEFAULT false,
  conditional_rules JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ALTERNATIVAS DE RESPOSTA (survey_options)
CREATE TABLE IF NOT EXISTS public.survey_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RESPOSTAS SUBMETIDAS (survey_responses)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  respondent_email TEXT,
  respondent_name TEXT,
  consent_research BOOLEAN NOT NULL DEFAULT true,
  consent_commercial BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. RESPOSTAS INDIVIDUAIS POR PERGUNTA (survey_answers)
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  selected_options JSONB DEFAULT '[]'::jsonb,
  other_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_surveys_slug ON public.surveys(slug);
CREATE INDEX IF NOT EXISTS idx_survey_blocks_survey ON public.survey_blocks(survey_id, order_index);
CREATE INDEX IF NOT EXISTS idx_survey_questions_block ON public.survey_questions(block_id, order_index);
CREATE INDEX IF NOT EXISTS idx_survey_options_question ON public.survey_options(question_id, order_index);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON public.survey_responses(survey_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_survey_answers_response ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON public.survey_answers(question_id);

-- ==============================================================================
-- SEGURANÇA E POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: LEITURA PÚBLICA DE PESQUISAS PUBLICADAS
DROP POLICY IF EXISTS "Public read published surveys" ON public.surveys;
CREATE POLICY "Public read published surveys" ON public.surveys
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Public read published survey versions" ON public.survey_versions;
CREATE POLICY "Public read published survey versions" ON public.survey_versions
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Public read active survey blocks" ON public.survey_blocks;
CREATE POLICY "Public read active survey blocks" ON public.survey_blocks
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.surveys s WHERE s.id = survey_blocks.survey_id AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read active survey questions" ON public.survey_questions;
CREATE POLICY "Public read active survey questions" ON public.survey_questions
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.survey_blocks b
      JOIN public.surveys s ON s.id = b.survey_id
      WHERE b.id = survey_questions.block_id AND b.is_active = true AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read active survey options" ON public.survey_options;
CREATE POLICY "Public read active survey options" ON public.survey_options
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.survey_questions q
      JOIN public.survey_blocks b ON b.id = q.block_id
      JOIN public.surveys s ON s.id = b.survey_id
      WHERE q.id = survey_options.question_id AND q.is_active = true AND b.is_active = true AND s.status = 'published'
    )
  );

-- SUBMISSÃO PÚBLICA DE RESPOSTAS
DROP POLICY IF EXISTS "Public insert survey responses" ON public.survey_responses;
CREATE POLICY "Public insert survey responses" ON public.survey_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert survey answers" ON public.survey_answers;
CREATE POLICY "Public insert survey answers" ON public.survey_answers
  FOR INSERT WITH CHECK (true);

-- ACESSO ADMINISTRATIVO INTEGRAL (ADMINS & SERVICE ROLE)
DROP POLICY IF EXISTS "Admin full access surveys" ON public.surveys;
CREATE POLICY "Admin full access surveys" ON public.surveys
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_versions" ON public.survey_versions;
CREATE POLICY "Admin full access survey_versions" ON public.survey_versions
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_blocks" ON public.survey_blocks;
CREATE POLICY "Admin full access survey_blocks" ON public.survey_blocks
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_questions" ON public.survey_questions;
CREATE POLICY "Admin full access survey_questions" ON public.survey_questions
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_options" ON public.survey_options;
CREATE POLICY "Admin full access survey_options" ON public.survey_options
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_responses" ON public.survey_responses;
CREATE POLICY "Admin full access survey_responses" ON public.survey_responses
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Admin full access survey_answers" ON public.survey_answers;
CREATE POLICY "Admin full access survey_answers" ON public.survey_answers
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin', 'gestor')
    )
  );

-- USUÁRIOS PODEM VISUALIZAR SUAS PRÓPRIAS RESPOSTAS
DROP POLICY IF EXISTS "Users view own responses" ON public.survey_responses;
CREATE POLICY "Users view own responses" ON public.survey_responses
  FOR SELECT USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users view own answers" ON public.survey_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses r
      WHERE r.id = survey_answers.response_id AND r.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- SEED DE DADOS INICIAL: PESQUISA "PERFIL & NEGÓCIOS"
-- ==============================================================================

DO $$
DECLARE
  v_survey_id UUID;
  v_version_id UUID;
  v_block_a_id UUID;
  v_block_b_id UUID;
  v_block_c_id UUID;
  v_q_id UUID;
  v_business_trigger_q_id UUID;
BEGIN
  -- Criar Pesquisa Perfil & Negócios se não existir
  SELECT id INTO v_survey_id FROM public.surveys WHERE slug = 'perfil-e-negocios';

  IF v_survey_id IS NULL THEN
    INSERT INTO public.surveys (title, slug, description, status, current_version)
    VALUES (
      'Conexão Maçônica • Perfil & Negócios',
      'perfil-e-negocios',
      'Pesquisa institucional de mapeamento do perfil dos irmãos, atividades econômicas e demanda por serviços na plataforma.',
      'published',
      1
    )
    RETURNING id INTO v_survey_id;

    -- Versão 1 Snapshot
    INSERT INTO public.survey_versions (survey_id, version_number, status, published_at, schema_snapshot)
    VALUES (
      v_survey_id,
      1,
      'published',
      now(),
      '{"version": 1, "name": "Versão Inicial Lançamento"}'::jsonb
    )
    RETURNING id INTO v_version_id;

    -- BLOCO A: Perfil
    INSERT INTO public.survey_blocks (survey_id, title, description, order_index, is_active)
    VALUES (v_survey_id, 'BLOCO A — Perfil', 'Informações pessoais e filiação institucional', 1, true)
    RETURNING id INTO v_block_a_id;

    -- Pergunta A1: Nome completo (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'Nome completo', 'short_text', 1, true, true);

    -- Pergunta A2: E-mail e Telefone (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'E-mail principal e WhatsApp de contato', 'Utilizados para validação e envio de novidades', 'short_text', 2, true, true);

    -- Pergunta A3: Loja Maçônica e Oriente (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'Nome e Número da sua Loja Maçônica', 'Ex: ARLS Ciência e Liberdade nº 123 - Oriente de São Paulo', 'short_text', 3, true, true);

    -- Pergunta A4: Grau Maçônico (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'Grau Maçônico Atual', 'single_choice', 4, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Aprendiz', 'aprendiz', 1),
      (v_q_id, 'Companheiro', 'companheiro', 2),
      (v_q_id, 'Mestre', 'mestre', 3),
      (v_q_id, 'Mestre Instalado / Past Master', 'mestre_instalado', 4);

    -- Pergunta A5: Atuação de Negócios / Gatilho do Bloco B (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'Possui empresa própria, atua como autônomo ou possui negócios na família?', 'Determina a exibição do Bloco de Negócios', 'single_choice', 5, true, true)
    RETURNING id INTO v_business_trigger_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_business_trigger_q_id, 'Sim, possuo empresa própria ou atuo como autônomo', 'sim_propria', 1),
      (v_business_trigger_q_id, 'Sim, minha família / esposa / filhos possuem empresa', 'sim_familiar', 2),
      (v_business_trigger_q_id, 'Sim, possuo negócios próprios e também familiares', 'ambos', 3),
      (v_business_trigger_q_id, 'Não possuo empresa nem negócio familiar no momento', 'nao', 4);

    -- Pergunta A6 (Complementar / Inativa por Padrão): Tempo de Maçonaria
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_a_id, 'Tempo de Caminhada Maçônica (Anos)', 'Pergunta complementar - ative no Editor Visual', 'short_text', 6, false, false);

    -- BLOCO B: Negócios
    INSERT INTO public.survey_blocks (survey_id, title, description, order_index, is_active)
    VALUES (v_survey_id, 'BLOCO B — Negócios', 'Mapeamento de atividades comerciais e interesse de anúncio', 2, true)
    RETURNING id INTO v_block_b_id;

    -- Pergunta B1: Nome do negócio principal (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_b_id, 'Nome da Empresa Principal ou Atuação Autônoma', 'Nome fantasia ou razão social', 'short_text', 1, true, true);

    -- Pergunta B2: Setor de atuação (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active, allow_other)
    VALUES (v_block_b_id, 'Setor Principal de Atuação', 'single_choice', 2, true, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Alimentação e Gastronomia', 'alimentacao', 1),
      (v_q_id, 'Arquitetura e Engenharia', 'engenharia', 2),
      (v_q_id, 'Advocacia e Consultoria Jurídica', 'juridico', 3),
      (v_q_id, 'Contabilidade e Finanças', 'contabilidade', 4),
      (v_q_id, 'Saúde, Odontologia e Medicina', 'saude', 5),
      (v_q_id, 'Tecnologia da Informação e Software', 'tecnologia', 6),
      (v_q_id, 'Varejo e Comércio Geral', 'comercio', 7),
      (v_q_id, 'Serviços Prestados a Empresas', 'servicos_b2b', 8);

    -- Pergunta B3: Negócios familiares adicionais (Ativa - Suporte a múltiplos negócios familiares)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_b_id, 'Possui outros negócios familiares ou segunda empresa que gostaria de mapear?', 'Ex: Empresa da cunhada, comércio familiar, consultoria secundária', 'long_text', 3, false, true);

    -- Pergunta B4: Tempo de funcionamento (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_b_id, 'Tempo de Funcionamento da Atividade / Empresa', 'single_choice', 4, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Menos de 1 ano', 'ate_1_ano', 1),
      (v_q_id, 'De 1 a 5 anos', '1_a_5_anos', 2),
      (v_q_id, 'De 5 a 10 anos', '5_a_10_anos', 3),
      (v_q_id, 'Mais de 10 anos', 'mais_10_anos', 4);

    -- Pergunta B5: Interesse em anunciar (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_b_id, 'Tem interesse em divulgar seus produtos/serviços para irmãos no Guia Maçônico?', 'Anúncios no Guia Comercial da Conexão Maçônica', 'single_choice', 5, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Sim, quero anunciar imediatamente', 'sim_imediatamente', 1),
      (v_q_id, 'Sim, tenho interesse em conhecer os planos', 'sim_conhecer', 2),
      (v_q_id, 'Apenas como consumidor/contratante no momento', 'apenas_consumidor', 3);

    -- Pergunta B6 (Complementar / Inativa por Padrão): Faturamento anual aproximado
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_b_id, 'Porte / Faturamento Anual da Empresa (Opcional)', 'Pergunta complementar mantida oculta no lançamento', 'single_choice', 6, false, false)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Até R$ 360 mil/ano (MEI/ME)', 'mei_me', 1),
      (v_q_id, 'De R$ 360 mil a R$ 4,8 mi/ano (EPP)', 'epp', 2),
      (v_q_id, 'Acima de R$ 4,8 mi/ano', 'grande_porte', 3);

    -- BLOCO C: Interesse
    INSERT INTO public.survey_blocks (survey_id, title, description, order_index, is_active)
    VALUES (v_survey_id, 'BLOCO C — Interesse & Avaliação', 'Expectativa em relação aos serviços da Conexão Maçônica', 3, true)
    RETURNING id INTO v_block_c_id;

    -- Pergunta C1: Utilizaria a plataforma? (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_c_id, 'Com que frequência você priorizaria contratar serviços de irmãos maçons através da plataforma?', 'single_choice', 1, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Sempre priorizo empresas de irmãos', 'sempre', 1),
      (v_q_id, 'Frequente, desde que o valor e qualidade sejam equivalentes', 'frequente', 2),
      (v_q_id, 'Ocasional', 'ocasional', 3);

    -- Pergunta C2: Benefícios e descontos (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_c_id, 'Quais benefícios você considera mais atraentes no clube de vantagens?', 'multiple_choice', 2, true, true)
    RETURNING id INTO v_q_id;

    INSERT INTO public.survey_options (question_id, label, value, order_index) VALUES
      (v_q_id, 'Descontos exclusivos entre membros', 'descontos_membros', 1),
      (v_q_id, 'Selo de verificação de pertença maçônica', 'selo_verificacao', 2),
      (v_q_id, 'Rede de contatos B2B e recomendação de negócios', 'rede_b2b', 3),
      (v_q_id, 'Eventos regionais e fórum de networking', 'eventos_networking', 4);

    -- Pergunta C3: Indicaria para outros irmãos? (Ativa)
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_c_id, 'Em uma escala de 1 a 10, o quanto você recomendaria a plataforma Conexão Maçônica para um irmão?', 'Net Promoter Score (NPS)', 'rating', 3, true, true);

    -- Pergunta C4 (Complementar / Inativa por Padrão): Comentários livres
    INSERT INTO public.survey_questions (block_id, question_text, help_text, question_type, order_index, is_required, is_active)
    VALUES (v_block_c_id, 'Comentários ou sugestões adicionais para a plataforma', 'Campo livre de feedback complementar', 'long_text', 4, false, false);

  END IF;
END $$;
