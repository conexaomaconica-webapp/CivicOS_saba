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

async function checkRpc() {
  // Testar chamada na RPC passando um payload dummy de teste
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/reconcile_commercial_payment_webhook`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_provider_event_id: 'test_probe_probe',
      p_payment_id: 'test_probe_probe',
      p_amount_cents: 0,
      p_event_type: 'TECHNICAL_PROBE',
    }),
  });
  console.log('Status HTTP da RPC:', res.status);
  const text = await res.text();
  console.log('Resposta da RPC:', text);
}

checkRpc().catch(console.error);
