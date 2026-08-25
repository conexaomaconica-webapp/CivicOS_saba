import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  console.log('1. Testing _resolve_public_tenant_id for localhost...');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/rpc/_resolve_public_tenant_id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
    body: JSON.stringify({ p_host: 'localhost' })
  });
  console.log(res2.status, await res2.text());

  console.log('\n2. Testing businesses table for saba-advocacia-bronze...');
  const res3 = await fetch(`${supabaseUrl}/rest/v1/businesses?slug=eq.saba-advocacia-bronze&select=id,tenant_id,is_active,publication_status`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  const text3 = await res3.text();
  console.log(res3.status, text3);
  
  let bizId = null;
  let tenantId = null;
  try {
    const arr = JSON.parse(text3);
    if (arr.length > 0) {
      bizId = arr[0].id;
      tenantId = arr[0].tenant_id;
    }
  } catch (e) {}

  if (bizId) {
    console.log('\n3. Testing _effective_business_plan...');
    const res4 = await fetch(`${supabaseUrl}/rest/v1/rpc/_effective_business_plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
      body: JSON.stringify({ p_tenant_id: tenantId, p_business_id: bizId })
    });
    console.log(res4.status, await res4.text());
  }

  console.log('\n4. Testing RPC public_business_detail...');
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/public_business_detail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
    body: JSON.stringify({ p_host: 'localhost', p_business_slug: 'saba-advocacia-bronze' })
  });
  console.log(res.status, await res.text());
}
run();
