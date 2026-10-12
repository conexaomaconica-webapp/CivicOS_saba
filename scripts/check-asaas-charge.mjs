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
const asaasKey = mergedEnv.ASAAS_API_KEY || mergedEnv.ASAAS_ACCESS_TOKEN;

async function checkAsaas() {
  const extRef = 'onb_a3f247dad83a0c0ad130383eaee457f59fd4555faaf571beb526337733d69cf8';
  console.log('Buscando cobrança no Asaas Produção por externalReference:', extRef);

  const res = await fetch(`https://api.asaas.com/v3/payments?externalReference=${encodeURIComponent(extRef)}`, {
    headers: { 'access_token': asaasKey },
  });
  console.log('Status HTTP Produção:', res.status);
  const data = await res.json();
  console.log('Resultado por externalReference:', JSON.stringify(data, null, 2));

  console.log('\nBuscando as 5 últimas cobranças no Asaas Produção:');
  const lastPaymentsRes = await fetch(`https://api.asaas.com/v3/payments?limit=5&order=desc`, {
    headers: { 'access_token': asaasKey },
  });
  console.log('Status HTTP últimas cobranças:', lastPaymentsRes.status);
  const lastData = await lastPaymentsRes.json();
  console.log('Últimas cobranças:', JSON.stringify(lastData, null, 2));
}

checkAsaas().catch(console.error);
