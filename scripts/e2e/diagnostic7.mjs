import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/public_business_detail`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_host: '127.0.0.1', p_business_slug: 'saba-advocacia-bronze' })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
  
  // Let's also check if the subscription is really there
  const res2 = await fetch(`${supabaseUrl}/rest/v1/subscriptions?select=*&business_id=eq.00000000-0000-0000-0000-000000000202`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log('Subscription:', await res2.text());
}
run();
