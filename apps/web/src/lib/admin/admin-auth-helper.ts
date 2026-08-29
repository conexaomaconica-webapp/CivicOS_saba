import { createServerSideClient } from '@/lib/supabase/server';

export async function assertPlatformAdminAccess() {
  const supabase = await createServerSideClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.');
  }

  const { data: rpcIsAdmin } = await (supabase as any).rpc('has_platform_admin_access');
  if (!rpcIsAdmin) {
    throw new Error('FORBIDDEN: Requer acesso de admin de plataforma.');
  }

  return { supabase, user };
}
