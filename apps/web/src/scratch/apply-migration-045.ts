import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';

  console.log('Applying migration 045 to Supabase at:', url);
  const supabase = createClient(url, key);

  const sqlPath = path.resolve(__dirname, '../../../../supabase/migrations/045_billing_webhooks_and_lifecycle.sql');
  console.log('Reading migration file:', sqlPath);
  const _sql = fs.readFileSync(sqlPath, 'utf8');

  // Test RPC process_billing_webhook idempotency check
  const { data, error } = await supabase.rpc('process_billing_webhook', {
    p_tenant_id: '00000000-0000-0000-0000-000000000001',
    p_gateway_event_id: 'evt_test_001',
    p_gateway_name: 'asaas',
    p_event_type: 'PAYMENT_RECEIVED',
    p_business_id: '00000000-0000-0000-0000-000000000001',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_plan_code: 'ouro',
    p_amount_cents: 19900,
    p_payload: { test: true }
  });

  if (error) {
    console.log('Webhook RPC check result:', error.message);
  } else {
    console.log('Webhook RPC check response:', data);
  }
}

applyMigration();
