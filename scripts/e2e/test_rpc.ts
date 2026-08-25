import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '../../.env.local') });

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam credenciais.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log('Testing RPC public_business_detail...');
  
  const { data, error } = await supabase.rpc('public_business_detail', {
    p_host: 'localhost',
    p_business_slug: 'saba-advocacia-bronze'
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Data:', JSON.stringify(data, null, 2));
  }

  console.log('\nTesting direct select from businesses...');
  const { data: bData } = await supabase.from('businesses').select('*').eq('slug', 'saba-advocacia-bronze').single();
  console.log('Business:', bData ? 'Found' : 'Not found', bData?.id);
  
  if (bData) {
    console.log('\nTesting direct select from subscriptions...');
    const { data: subData } = await supabase.from('subscriptions').select('*').eq('business_id', bData.id);
    console.log('Subscriptions found:', subData?.length);
    console.log(subData);
  }
}

testRpc();
