import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  console.log('--- plans ---');
  const res1 = await fetch(`${supabaseUrl}/rest/v1/plans?select=id,tenant_id,code`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log(await res1.text());
}
run();
