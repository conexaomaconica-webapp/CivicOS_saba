import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function query(table, select = '*') {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${select}`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log(`\n--- ${table} ---`);
  console.log(await res.text());
}

async function run() {
  await query('plans');
  await query('plan_versions');
  await query('subscriptions?business_id=eq.00000000-0000-0000-0000-000000000202');
}
run();
