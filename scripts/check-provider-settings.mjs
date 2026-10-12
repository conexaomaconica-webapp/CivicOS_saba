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

async function checkPaymentProviderSettings() {
  const res = await fetch(`${supabaseUrl}/rest/v1/payment_provider_settings?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  console.log('payment_provider_settings:', JSON.stringify(data.map(d => ({
    id: d.id,
    provider: d.provider,
    environment: d.environment,
    is_active_environment: d.is_active_environment,
    is_enabled: d.is_enabled,
    has_encrypted_api_key: Boolean(d.encrypted_api_key),
    has_encrypted_webhook_token: Boolean(d.encrypted_webhook_token),
    webhook_id: d.webhook_id,
    webhook_url: d.webhook_url,
    last_connection_test_success: d.last_connection_test_success,
    last_connection_error: d.last_connection_error,
  })), null, 2));
}

checkPaymentProviderSettings().catch(console.error);
