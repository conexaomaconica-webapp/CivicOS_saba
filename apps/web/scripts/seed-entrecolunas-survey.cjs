const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('Verifying if "entrecolunas" survey exists...');

  const { data: existing, error: findError } = await supabase
    .from('surveys')
    .select('id, title, slug, current_version')
    .eq('slug', 'entrecolunas')
    .maybeSingle();

  if (findError) {
    console.error('Error checking existing survey:', findError);
    process.exit(1);
  }

  if (existing) {
    console.log('Survey "entrecolunas" already exists with ID:', existing.id);
    return existing;
  }

  console.log('Creating survey "Entre Colunas · Pesquisa de Opinião e Interesse"...');

  // 1. Inserir Survey
  const { data: survey, error: sErr } = await supabase
    .from('surveys')
    .insert({
      title: 'Entre Colunas · Pesquisa de Opinião e Interesse',
      slug: 'entrecolunas',
      description: 'Pesquisa rápida de 3 perguntas na landing page de pré-lançamento /entrecolunas.',
      status: 'published',
      current_version: 1,
      show_logo: true,
      header_color: '#4B161B',
      logo_url: '/icone.png',
    })
    .select('id, title, slug, current_version')
    .single();

  if (sErr || !survey) {
    console.error('Error creating survey:', sErr);
    process.exit(1);
  }

  console.log('Survey created:', survey.id);

  // 2. Inserir Bloco
  const { data: block, error: bErr } = await supabase
    .from('survey_blocks')
    .insert({
      survey_id: survey.id,
      title: 'Perguntas de Pré-Lançamento',
      description: '3 perguntas para conhecer o perfil e as expectativas para a plataforma.',
      order_index: 1,
      is_active: true,
    })
    .select('id')
    .single();

  if (bErr || !block) {
    console.error('Error creating block:', bErr);
    process.exit(1);
  }

  // 3. Inserir Perguntas e Opções
  // Pergunta 1: Vínculo
  const { data: q1, error: q1Err } = await supabase
    .from('survey_questions')
    .insert({
      block_id: block.id,
      question_text: 'Qual é o seu vínculo com a Maçonaria?',
      question_type: 'single_choice',
      order_index: 1,
      is_required: true,
      is_active: true,
      allow_other: false,
    })
    .select('id')
    .single();

  if (q1Err || !q1) {
    console.error('Error creating Q1:', q1Err);
    process.exit(1);
  }

  await supabase.from('survey_options').insert([
    { question_id: q1.id, label: 'Irmão', value: 'irmao', order_index: 1, is_active: true },
    { question_id: q1.id, label: 'Cunhada', value: 'cunhada', order_index: 2, is_active: true },
    { question_id: q1.id, label: 'Familiar', value: 'familiar', order_index: 3, is_active: true },
  ]);

  // Pergunta 2: Intenção
  const { data: q2, error: q2Err } = await supabase
    .from('survey_questions')
    .insert({
      block_id: block.id,
      question_text: 'Como você pretende utilizar a Conexão Maçônica?',
      question_type: 'single_choice',
      order_index: 2,
      is_required: true,
      is_active: true,
      allow_other: false,
    })
    .select('id')
    .single();

  if (q2Err || !q2) {
    console.error('Error creating Q2:', q2Err);
    process.exit(1);
  }

  await supabase.from('survey_options').insert([
    { question_id: q2.id, label: 'Para encontrar produtos e serviços', value: 'encontrar', order_index: 1, is_active: true },
    { question_id: q2.id, label: 'Para divulgar minha empresa ou atuação profissional', value: 'divulgar', order_index: 2, is_active: true },
    { question_id: q2.id, label: 'Para as duas possibilidades', value: 'ambas', order_index: 3, is_active: true },
  ]);

  // Pergunta 3: Categorias
  const { data: q3, error: q3Err } = await supabase
    .from('survey_questions')
    .insert({
      block_id: block.id,
      question_text: 'Quais produtos ou serviços você mais gostaria de encontrar?',
      question_type: 'multiple_choice',
      order_index: 3,
      is_required: false,
      is_active: true,
      allow_other: false,
    })
    .select('id')
    .single();

  if (q3Err || !q3) {
    console.error('Error creating Q3:', q3Err);
    process.exit(1);
  }

  await supabase.from('survey_options').insert([
    { question_id: q3.id, label: 'Saúde e bem-estar', value: 'saude_e_bem_estar', order_index: 1, is_active: true },
    { question_id: q3.id, label: 'Serviços profissionais', value: 'servicos_profissionais', order_index: 2, is_active: true },
    { question_id: q3.id, label: 'Casa e reformas', value: 'casa_e_reformas', order_index: 3, is_active: true },
    { question_id: q3.id, label: 'Automóveis', value: 'automoveis', order_index: 4, is_active: true },
    { question_id: q3.id, label: 'Alimentação', value: 'alimentacao', order_index: 5, is_active: true },
    { question_id: q3.id, label: 'Educação', value: 'educacao', order_index: 6, is_active: true },
    { question_id: q3.id, label: 'Outros', value: 'outros', order_index: 7, is_active: true },
  ]);

  // 4. Inserir Versão Snapshot Inicial
  await supabase.from('survey_versions').insert({
    survey_id: survey.id,
    version_number: 1,
    status: 'published',
    schema_snapshot: {
      version: 1,
      published_at: new Date().toISOString(),
      survey_title: survey.title,
    },
  });

  console.log('Entre Colunas survey successfully created and published in database!');
  return survey;
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
