import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

async function run() {
  const query = "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions';";
  
  // Actually, we can't query information_schema easily via rest/v1/subscriptions
  // but we can just use the GraphQL endpoint or something?
  // No, we can just fetch one row, but it's empty.
  // Wait, if we send an OPTIONS request to /rest/v1/subscriptions it returns the schema!
  const res = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: 'OPTIONS',
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey }
  });
  console.log(await res.text());
}
run();
