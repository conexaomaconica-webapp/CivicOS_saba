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
const asaasKey = mergedEnv.ASAAS_API_KEY || mergedEnv.ASAAS_ACCESS_TOKEN;
const asaasEnv = mergedEnv.ASAAS_ENVIRONMENT || 'sandbox';
const asaasWebhookSecret = mergedEnv.ASAAS_WEBHOOK_SECRET || mergedEnv.ASAAS_WEBHOOK_AUTH_TOKEN;

console.log('=== 1. DIAGNÓSTICO DE CONFIGURAÇÃO DE AMBIENTE ===');
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.slice(0, 28)}...` : 'NÃO CONFIGURADO');
console.log('Supabase Service Role Key:', supabaseKey ? 'PRESENTE' : 'AUSENTE');
console.log('ASAAS_ENVIRONMENT:', asaasEnv);
console.log('Asaas API Key prefixo:', asaasKey ? `${asaasKey.slice(0, 12)}... (tamanho: ${asaasKey.length})` : 'AUSENTE');
console.log('Asaas Webhook Secret:', asaasWebhookSecret ? `CONFIGURADO (tamanho: ${asaasWebhookSecret.length})` : 'AUSENTE');

async function supabaseFetch(tableAndQuery) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${tableAndQuery}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function main() {
  console.log('\n=== 2. ÚLTIMAS 5 TENTATIVAS DE PAGAMENTO (payment_attempts) ===');
  const attempts = await supabaseFetch('payment_attempts?select=id,created_at,business_id,provider_code,provider_charge_id,provider_environment,payment_method,status,payload_received&order=created_at.desc&limit=5');
  console.log(JSON.stringify(attempts, null, 2));

  console.log('\n=== 3. ÚLTIMOS 10 EVENTOS DE WEBHOOK (payment_provider_events) ===');
  const events = await supabaseFetch('payment_provider_events?select=id,created_at,event_id,event_type,processed,processed_at,error_log,payload&order=created_at.desc&limit=10');
  const sanitizedEvents = (events || []).map(e => ({
    id: e.id,
    created_at: e.created_at,
    event_id: e.event_id,
    event_type: e.event_type,
    processed: e.processed,
    processed_at: e.processed_at,
    error_log: e.error_log,
    payload_event: e.payload?.event,
    payload_payment_id: e.payload?.payment?.id,
    payload_status: e.payload?.payment?.status,
  }));
  console.log(JSON.stringify(sanitizedEvents, null, 2));

  console.log('\n=== 4. ÚLTIMAS 5 FATURAS (invoices) ===');
  const invoices = await supabaseFetch('invoices?select=id,created_at,business_id,invoice_number,status,amount_due,amount_paid,payment_method,idempotency_key&order=created_at.desc&limit=5');
  console.log(JSON.stringify(invoices, null, 2));

  let businessId = attempts?.[0]?.business_id || invoices?.[0]?.business_id;
  if (businessId) {
    console.log(`\n=== 5. STATUS DA EMPRESA ${businessId} (businesses) ===`);
    const biz = await supabaseFetch(`businesses?id=eq.${businessId}&select=id,name,commercial_status,updated_at`);
    console.log(JSON.stringify(biz, null, 2));
  }

  // 6. Consultar cobrança no Asaas Sandbox
  const latestChargeId = attempts?.[0]?.provider_charge_id;
  console.log(`\n=== 6. CONSULTA DA COBRANÇA ${latestChargeId} NO ASAAS ===`);
  if (latestChargeId && asaasKey) {
    for (const envEndpoint of ['https://api-sandbox.asaas.com/v3', 'https://api.asaas.com/v3']) {
      try {
        console.log(`Testando endpoint ${envEndpoint}/payments/${latestChargeId}...`);
        const asaasRes = await fetch(`${envEndpoint}/payments/${latestChargeId}`, {
          headers: { 'access_token': asaasKey },
        });
        console.log(`Status HTTP: ${asaasRes.status}`);
        if (asaasRes.ok) {
          const asaasData = await asaasRes.json();
          console.log(`Sucesso em ${envEndpoint}:`, {
            id: asaasData.id,
            dateCreated: asaasData.dateCreated,
            customer: asaasData.customer,
            value: asaasData.value,
            billingType: asaasData.billingType,
            status: asaasData.status,
            confirmedDate: asaasData.confirmedDate,
            paymentDate: asaasData.paymentDate,
            creditCard: asaasData.creditCard ? {
              creditCardBrand: asaasData.creditCard.creditCardBrand,
              creditCardNumber: asaasData.creditCard.creditCardNumber,
            } : null,
          });
          break;
        } else {
          console.log(`Falha em ${envEndpoint}:`, await asaasRes.text());
        }
      } catch (e) {
        console.error(`Erro em ${envEndpoint}:`, e.message);
      }
    }
  }

  // 7. Consultar Configuração de Webhooks no Asaas Sandbox
  if (asaasKey) {
    console.log('\n=== 7. WEBHOOKS CADASTRADOS NO ASAAS ===');
    for (const envEndpoint of ['https://api-sandbox.asaas.com/v3', 'https://api.asaas.com/v3']) {
      try {
        const whRes = await fetch(`${envEndpoint}/webhooks`, {
          headers: { 'access_token': asaasKey },
        });
        if (whRes.ok) {
          const whData = await whRes.json();
          console.log(`Webhooks em ${envEndpoint}:`, JSON.stringify(whData, null, 2));
        } else {
          console.log(`Webhooks em ${envEndpoint} HTTP ${whRes.status}:`, await whRes.text());
        }
      } catch (e) {
        console.error(`Erro webhook em ${envEndpoint}:`, e.message);
      }
    }
  }
}

main().catch(err => console.error('Erro na execução:', err));
