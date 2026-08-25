import fs from 'fs';

const envFile = fs.readFileSync('apps/web/.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/public_business_detail`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_host: 'localhost', p_business_slug: 'saba-advocacia-bronze' })
  });
  
  console.log('Status:', res.status);
  console.log('Response:', await res.text());
}
run();
