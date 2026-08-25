import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking directory_businesses...');
  const { data: biz, error } = await supabase.from('directory_businesses').select('*');
  if (error) console.error(error);
  else console.log(`Found ${biz?.length || 0} businesses:`, biz);
}

check();
