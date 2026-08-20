import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking tenants...');
  const { data: tenants, error: err1 } = await supabase.from('tenants').select('id, name');
  console.log('Tenants:', tenants);
  if (err1) console.error(err1);
}

check();
