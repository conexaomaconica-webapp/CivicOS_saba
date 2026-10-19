import { createServerSideClient } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';

export async function assertPlatformAdminAccess() {
  const supabase = await createServerSideClient();
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.');
  }

  const { data: rpcIsAdmin } = await (
    supabase as unknown as { rpc: (fn: string) => Promise<{ data: boolean | null; error: unknown }> }
  ).rpc('has_platform_admin_access');
  if (!rpcIsAdmin) {
    throw new Error('FORBIDDEN: Requer acesso de admin de plataforma.');
  }

  return { supabase, user };
}

export async function assertMasterAdminAccess() {
  const supabase = await createServerSideClient();
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Sessão expirada ou usuário não autenticado.');
  }

  // Consulta canônica do perfil para validação estrita do papel 'master'
  const profile = await getProfileAuthorization(supabase, user.id);
  if (!profile) {
    throw new Error('UNAUTHORIZED: Perfil de usuário não localizado.');
  }

  const role = (profile.role || '').trim().toLowerCase();
  if (role !== 'master') {
    throw new Error('FORBIDDEN: Acesso restrito exclusivamente ao perfil Master.');
  }

  return { supabase, user, role };
}


