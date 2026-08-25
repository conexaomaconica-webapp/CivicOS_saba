import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuthAndProfiles() {
  console.log('Checking auth users and profiles...');
  const { data: users, error: errAuth } = await supabase.auth.admin.listUsers();
  if (errAuth) console.error('Auth error:', errAuth);
  else console.log('Auth Users:', users.users.map(u => ({ id: u.id, email: u.email })));

  const { data: profiles, error: errProf } = await supabase.from('profiles').select('id, email, role, tenant_id');
  if (errProf) console.error('Profiles error:', errProf);
  else console.log('Profiles:', profiles);
}

checkAuthAndProfiles();
