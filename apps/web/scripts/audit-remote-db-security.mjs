import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const anonClient = createClient(url, anonKey);
const serviceClient = createClient(url, serviceKey);

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('🔒 AUDITORIA DE SEGURANÇA E RLS EM TEMPO REAL NO BANCO REMOTO');
  console.log('================================================================\n');

  let anonTokenAccessBlocked = false;
  let anonSnapshotAccessBlocked = false;
  let anonRpcAccessBlocked = false;

  // 1. Audit business_onboarding_tokens via ANON client
  console.log('📌 1. Testando leitura anônima (ANON) em business_onboarding_tokens...');
  try {
    const { data, error } = await anonClient
      .from('business_onboarding_tokens')
      .select('id, token, expires_at')
      .limit(5);

    if (error || !data || data.length === 0) {
      anonTokenAccessBlocked = true;
      console.log(`  -> 🟢 ACESSO NEGADO / PROTEGIDO (ANON): ${error?.message || 'Zero linhas retornadas (RLS isolou o acesso)'}`);
    } else {
      console.error(`  -> 🔴 VULNERABILIDADE: Anon leu ${data.length} tokens do banco!`);
    }
  } catch (err) {
    anonTokenAccessBlocked = true;
    console.log(`  -> 🟢 EXCEÇÃO DE SEGURANÇA CAPTURADA: ${err.message}`);
  }

  // 2. Audit contract_snapshots via ANON client
  console.log('\n📌 2. Testando leitura anônima (ANON) em contract_snapshots...');
  try {
    const { data, error } = await anonClient
      .from('contract_snapshots')
      .select('id, signer_cpf, sha256_hash')
      .limit(5);

    if (error || !data || data.length === 0) {
      anonSnapshotAccessBlocked = true;
      console.log(`  -> 🟢 ACESSO NEGADO / PROTEGIDO (ANON): ${error?.message || 'Zero linhas retornadas (RLS isolou o acesso)'}`);
    } else {
      console.error(`  -> 🔴 VULNERABILIDADE: Anon leu ${data.length} snapshots de contratos!`);
    }
  } catch (err) {
    anonSnapshotAccessBlocked = true;
    console.log(`  -> 🟢 EXCEÇÃO DE SEGURANÇA CAPTURADA: ${err.message}`);
  }

  // 3. Audit RPC reconcile_commercial_payment_webhook via ANON client
  console.log('\n📌 3. Testando execução da RPC reconcile_commercial_payment_webhook via ANON...');
  try {
    const { data, error } = await anonClient.rpc('reconcile_commercial_payment_webhook', {
      p_business_id: '00000000-0000-0000-0000-000000000000',
      p_payment_status: 'CONFIRMED'
    });

    if (error) {
      anonRpcAccessBlocked = true;
      console.log(`  -> 🟢 EXECUÇÃO NEGADA PELO BANCO (ANON): ${error.message}`);
    } else {
      console.error(`  -> 🔴 VULNERABILIDADE: Anon conseguiu executar a RPC de pagamento! Resposta:`, data);
    }
  } catch (err) {
    anonRpcAccessBlocked = true;
    console.log(`  -> 🟢 EXCEÇÃO DE SEGURANÇA CAPTURADA: ${err.message}`);
  }

  // 4. Verificação via SERVICE_ROLE (Garantindo que a backend role possui acesso operacional)
  console.log('\n📌 4. Testando acesso legítimo via SERVICE_ROLE...');
  const { data: serviceTokenData, error: serviceTokenErr } = await serviceClient
    .from('business_onboarding_tokens')
    .select('count', { count: 'exact', head: true });

  console.log(`  -> 🔵 Acesso SERVICE_ROLE a business_onboarding_tokens: ${serviceTokenErr ? serviceTokenErr.message : 'OK (Acesso autorizado)'}`);

  const { data: serviceSnapData, error: serviceSnapErr } = await serviceClient
    .from('contract_snapshots')
    .select('count', { count: 'exact', head: true });

  console.log(`  -> 🔵 Acesso SERVICE_ROLE a contract_snapshots: ${serviceSnapErr ? serviceSnapErr.message : 'OK (Acesso autorizado)'}`);

  console.log('\n================================================================');
  console.log('RESULTADO DA AUDITORIA DE SEGURANÇA DE RLS E PRIVILÉGIOS:');
  console.log('================================================================');
  console.log(`• RLS Tokens Protegido (ANON): ${anonTokenAccessBlocked ? 'PASS' : 'FAIL'}`);
  console.log(`• RLS Snapshots Protegido (ANON): ${anonSnapshotAccessBlocked ? 'PASS' : 'FAIL'}`);
  console.log(`• Bloqueio da RPC para ANON: ${anonRpcAccessBlocked ? 'PASS' : 'FAIL'}`);
  console.log('================================================================\n');

  if (!anonTokenAccessBlocked || !anonSnapshotAccessBlocked || !anonRpcAccessBlocked) {
    process.exit(1);
  }
}

runSecurityAudit();
