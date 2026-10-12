import fs from 'fs';

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const rootEnv = loadEnv('E:/projetos/saas-platform/.env.local');
const webEnv = loadEnv('E:/projetos/saas-platform/apps/web/.env.local');
const mergedEnv = { ...rootEnv, ...webEnv, ...process.env };
const supabaseUrl = mergedEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(tableAndQuery) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${tableAndQuery}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  return await res.json();
}

async function main() {
  const bizId = '084f4df9-337b-4d3b-993a-d773b21e5fcb';
  console.log('=== AUDITORIA RECENTE DA EMPRESA ===');
  const auditLogs = await supabaseFetch(`admin_audit_logs?entity_id=eq.${bizId}&order=created_at.desc&limit=10`);
  console.log(JSON.stringify(auditLogs, null, 2));

  console.log('\n=== TOKENS DE ONBOARDING ===');
  const tokens = await supabaseFetch(`business_onboarding_tokens?business_id=eq.${bizId}&order=created_at.desc&limit=5`);
  console.log(JSON.stringify(tokens, null, 2));

  console.log('\n=== CONTRATOS ===');
  const contracts = await supabaseFetch(`contracts?business_id=eq.${bizId}&order=created_at.desc&limit=5`);
  console.log(JSON.stringify(contracts, null, 2));

  console.log('\n=== TERMOS COMERCIAIS ===');
  const terms = await supabaseFetch(`business_commercial_terms?business_id=eq.${bizId}&limit=1`);
  console.log(JSON.stringify(terms, null, 2));
}

main().catch(console.error);
