import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';

  console.log('Connecting to Supabase at:', url);
  const supabase = createClient(url, key);

  const sqlPath = path.resolve(__dirname, '../../../../supabase/migrations/044_media_storage_and_plan_entitlements.sql');
  console.log('Reading migration file:', sqlPath);
  fs.readFileSync(sqlPath, 'utf8');

  // Executa SQL raw via rpc se disponível ou valida Supabase
  const { data, error } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: '00000000-0000-0000-0000-000000000001',
    p_plan_code: 'ouro',
    p_feature_code: 'services_limit'
  });

  if (error) {
    console.log('RPC check before migration:', error.message);
  } else {
    console.log('Current plan entitlement limit:', data);
  }
}

applyMigration();
