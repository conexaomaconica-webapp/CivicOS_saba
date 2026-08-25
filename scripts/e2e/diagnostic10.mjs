import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/entitlement_grants?limit=10`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log('Grants:', await res.text());
  
  const res2 = await fetch(`${supabaseUrl}/rest/v1/entitlement_sources?limit=10`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log('Sources:', await res2.text());
}
run();
