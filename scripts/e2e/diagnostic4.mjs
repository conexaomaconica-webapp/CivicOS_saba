import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/subscriptions?limit=1`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log(await res.text());
}
run();
