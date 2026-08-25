import fs from 'node:fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envFile.split('\n')) {
  if (line.startsWith('E2E_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('E2E_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
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

async function runSmokeTests() {
  console.log('--- Smoke Test 1: public_directory_home_data ---');
  const res1 = await callRpc('public_directory_home_data', { p_host: 'localhost:3000', p_city: null });
  console.log('HTTP Status 1:', res1.status);
  if (res1.status === 200 && res1.data) {
    console.log('Home Settings:', res1.data.settings);
    console.log('Banners Count:', res1.data.banners?.length);
    console.log('Categories Count:', res1.data.categories?.length);
    console.log('Sponsored Count:', res1.data.sponsored?.length);
    console.log('Cities Available:', res1.data.available_cities);
  } else {
    console.log('Response 1:', res1.data);
  }

  console.log('\n--- Smoke Test 2: public_businesses_search ---');
  const res2 = await callRpc('public_businesses_search', {
    p_host: 'localhost:3000',
    p_query: null,
    p_page: 1,
    p_page_size: 12
  });
  console.log('HTTP Status 2:', res2.status);
  if (res2.status === 200 && res2.data) {
    console.log('Total Businesses:', res2.data.total);
    console.log('Items Returned:', res2.data.items?.length);
    console.log('Sample Business:', res2.data.items?.[0]?.name);
  } else {
    console.log('Response 2:', res2.data);
  }

  console.log('\n--- Smoke Test 3: public_organizations_search ---');
  const res3 = await callRpc('public_organizations_search', {
    p_host: 'localhost:3000',
    p_page: 1,
    p_page_size: 12
  });
  console.log('HTTP Status 3:', res3.status);
  if (res3.status === 200 && res3.data) {
    console.log('Total Lodges:', res3.data.total);
    console.log('Lodges Returned:', res3.data.items?.length);
    console.log('Sample Lodge:', res3.data.items?.[0]?.name);
  } else {
    console.log('Response 3:', res3.data);
  }
}

runSmokeTests();
