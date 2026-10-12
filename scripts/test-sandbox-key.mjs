import fs from 'fs';
import crypto from 'crypto';

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

function getDerivedEncryptionKey() {
  const source = mergedEnv.ASAAS_SETTINGS_ENCRYPTION_KEY || mergedEnv.SUPABASE_SERVICE_ROLE_KEY;
  return crypto.createHash('sha256').update(source).digest();
}

function decryptSecret(cipherText) {
  if (!cipherText || !cipherText.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
    const key = getDerivedEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
  } catch (e) {
    return '';
  }
}

async function testSandbox() {
  const res = await fetch(`${supabaseUrl}/rest/v1/payment_provider_settings?environment=eq.sandbox&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  const sandboxRecord = data[0];
  if (!sandboxRecord) {
    console.log('Nenhum registro de sandbox encontrado');
    return;
  }

  const decryptedKey = decryptSecret(sandboxRecord.encrypted_api_key);
  const decryptedWebhookToken = decryptSecret(sandboxRecord.encrypted_webhook_token);

  console.log('Chave Sandbox do Banco:', decryptedKey ? `PRESENTE (prefixo: ${decryptedKey.slice(0, 10)}..., tamanho: ${decryptedKey.length})` : 'FALHA NA DESCRIPTOGRAFIA');
  console.log('Webhook Token Sandbox do Banco:', decryptedWebhookToken ? `PRESENTE (tamanho: ${decryptedWebhookToken.length})` : 'AUSENTE');

  if (decryptedKey) {
    console.log('\n--- Testando GET /payments no Asaas Sandbox com chave do banco ---');
    const pRes = await fetch('https://api-sandbox.asaas.com/v3/payments?limit=5&order=desc', {
      headers: { 'access_token': decryptedKey },
    });
    console.log('Status HTTP Sandbox /payments:', pRes.status);
    if (pRes.ok) {
      const pData = await pRes.json();
      console.log('Últimos pagamentos no Sandbox:', JSON.stringify(pData.data.map(p => ({
        id: p.id,
        dateCreated: p.dateCreated,
        customer: p.customer,
        value: p.value,
        billingType: p.billingType,
        status: p.status,
        description: p.description,
        externalReference: p.externalReference,
        confirmedDate: p.confirmedDate,
      })), null, 2));
    } else {
      console.log('Erro Asaas Sandbox:', await pRes.text());
    }

    console.log('\n--- Testando GET /webhooks no Asaas Sandbox com chave do banco ---');
    const wRes = await fetch('https://api-sandbox.asaas.com/v3/webhooks', {
      headers: { 'access_token': decryptedKey },
    });
    console.log('Status HTTP Sandbox /webhooks:', wRes.status);
    if (wRes.ok) {
      const wData = await wRes.json();
      console.log('Webhooks configurados no Sandbox:', JSON.stringify(wData, null, 2));
    } else {
      console.log('Erro Asaas Sandbox Webhooks:', await wRes.text());
    }
  }
}

testSandbox().catch(console.error);
