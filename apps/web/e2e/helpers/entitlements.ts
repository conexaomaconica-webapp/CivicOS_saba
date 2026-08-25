import { getE2EEnv } from './e2e-env';
import { createClient } from '@supabase/supabase-js';

// Cliente estático do Supabase configurado exclusivamente para uso em scripts E2E e asserções diretas no banco
const env = getE2EEnv();
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

export async function fetchCurrentEntitlementLimit(planCode: string, featureCode: string): Promise<number> {
  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  
  const { data, error } = await supabase.rpc('_get_plan_entitlement', {
    p_tenant_id: DEFAULT_TENANT_ID,
    p_plan_code: planCode,
    p_feature_code: featureCode,
  });

  if (error) {
    throw new Error(`Failed to fetch entitlement limit for ${planCode}/${featureCode}: ${error.message}`);
  }

  return (data as number) ?? 0;
}
