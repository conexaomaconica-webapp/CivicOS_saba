import fs from 'node:fs';

const envFile = fs.readFileSync('apps/web/.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envFile.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
}

function normalizeSearchTerm(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function callRpc(fnName, body = {}) {
  const url = `${supabaseUrl}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('Testing queries with client normalization:');
  
  const rawQueries = ['SABA', 'saba', 'ADVOCACIA', 'advocacia', 'advocacía', 'CONEXÃO', 'conexao'];
  
  for (const raw of rawQueries) {
    const norm = normalizeSearchTerm(raw);
    const res = await callRpc('public_businesses_search', {
      p_host: 'localhost:3000',
      p_query: norm,
      p_page: 1,
      p_page_size: 10
    });
    console.log(`Raw: "${raw}" ➔ Normalized: "${norm}" ➔ Status: ${res.status}, Matches: ${res.data?.total ?? 0}`);
  }
}

runTests();
