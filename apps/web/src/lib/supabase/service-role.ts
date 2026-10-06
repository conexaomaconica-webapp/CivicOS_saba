import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente com a chave de serviço (ignora RLS). Só no servidor, e só DEPOIS de a ação ter conferido, no código, que o
 * usuário logado pode mexer naquela empresa. Nunca importar de componentes de navegador.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  // Testes unitários nunca falam com o banco real.
  if (process.env.VITEST) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
