import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega as variáveis do ambiente de staging/local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

if (
  process.env.E2E_ALLOW_DESTRUCTIVE !== 'true' ||
  !supabaseUrl
) {
  console.error('E2E staging environment not authorized. Missing E2E_ALLOW_DESTRUCTIVE=true or E2E_SUPABASE_URL.');
  process.exit(1);
}

const KNOWN_PROD_URL = process.env.PROD_SUPABASE_URL || 'https://substitua-pela-url-de-prod.supabase.co';
if (supabaseUrl === KNOWN_PROD_URL) {
  console.error('CRITICAL: E2E_SUPABASE_URL is matching the production URL! Aborting to prevent data loss.');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam credenciais de Supabase (E2E_SUPABASE_URL / E2E_SUPABASE_SERVICE_ROLE_KEY) nas variáveis de ambiente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Dados dos perfis comerciais para E2E
const e2eProfiles = [
  {
    plan: 'bronze',
    name: 'E2E Bronze Auto',
    document: '11111111111111',
    email: 'e2e-bronze@conexaomaconica.com.br',
  },
  {
    plan: 'prata',
    name: 'E2E Prata Auto',
    document: '22222222222222',
    email: 'e2e-prata@conexaomaconica.com.br',
  },
  {
    plan: 'ouro',
    name: 'E2E Ouro Auto',
    document: '33333333333333',
    email: 'e2e-ouro@conexaomaconica.com.br',
  },
  {
    plan: 'ouro_founder',
    name: 'E2E Ouro Founder Auto',
    document: '44444444444444',
    email: 'e2e-founder@conexaomaconica.com.br',
  },
];

async function seedHomologation() {
  console.log('🌱 Iniciando Seed E2E de Homologação...');
  
  // 1. Garantir que o tenant existe
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', DEFAULT_TENANT_ID)
    .single();

  if (tErr || !tenant) {
    console.error('Tenant padrão não encontrado. Verifique o banco.');
    process.exit(1);
  }

  // 2. Para cada perfil, criar Auth, Business, e Assinatura Ativa
  for (const profile of e2eProfiles) {
    console.log(`\n🔹 Processando perfil: ${profile.plan}`);
    
    // a) Limpar registro anterior se existir (E2E repete com frequência)
    // Uma forma segura de limpar cascata seria apagar a auth.users, o que propaga para as demais tabelas
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const targetUser = existingUser?.users.find(u => u.email === profile.email);
    
    if (targetUser) {
      console.log(`Deletando usuário antigo de teste: ${targetUser.id}`);
      await supabase.auth.admin.deleteUser(targetUser.id);
      
      // Cleanup de negócios residuais
      await supabase.from('businesses').delete().eq('document_number', profile.document);
    }

    // b) Criar usuário de Auth (bypassando e-mail)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: 'password_e2e_123',
      email_confirm: true,
      user_metadata: { name: profile.name },
    });

    if (authErr || !authData.user) {
      console.error(`Erro ao criar usuário ${profile.email}:`, authErr);
      continue;
    }
    const userId = authData.user.id;

    // c) Criar Empresa
    const { data: bizData, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        owner_id: userId,
        name: profile.name,
        document_number: profile.document,
        slug: `e2e-${profile.plan}-auto`,
        category: 'Testes',
        city: 'Homologação',
        state: 'SP',
        publication_status: 'published'
      })
      .select('id')
      .single();

    if (bizErr || !bizData) {
      console.error(`Erro ao criar empresa para ${profile.plan}:`, bizErr);
      continue;
    }
    const businessId = bizData.id;

    // d) Injetar assinatura forçada (Subscription)
    const { error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        business_id: businessId,
        user_id: userId,
        status: 'active',
        plan_version_id: '00000000-0000-0000-0000-000000000000', // Mock ou buscar um ID de versão real se a FK for restrita
        billing_period: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false
      });

    // Como o schema do banco exige uma versão de plano real, pode falhar caso não haja mock.
    // Vamos injetar o plan_code de forma rudimentar caso falhe. No entanto, o `_effective_business_plan` 
    // usa assinaturas reais.
    
    // ATENÇÃO: Dependendo das FKs de subscription, precisamos buscar o `plan_versions` correto.
    const { data: planVer } = await supabase
      .from('plan_versions')
      .select('id')
      .eq('plan_code', profile.plan)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (planVer) {
      await supabase.from('subscriptions').update({ plan_version_id: planVer.id }).eq('business_id', businessId);
      console.log(`✅ Assinatura ativa vinculada para ${profile.plan}`);
    } else {
      console.warn(`⚠️ Aviso: Versão de plano ativa para ${profile.plan} não encontrada. Assinatura pode ficar órfã.`);
    }
    
    console.log(`🚀 Finalizado perfil ${profile.plan} -> Email: ${profile.email}`);
  }

  console.log('\n🏁 Seed E2E de Homologação completo!');
}

seedHomologation().catch(console.error);
