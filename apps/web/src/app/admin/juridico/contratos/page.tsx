import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';
import ContractsManagementClient from './contracts-management-client';

export const metadata = {
  title: 'Admin · Modelos de Contratos & Jurídico — Conexão Maçônica',
};

export default async function AdminJuridicoContratosPage() {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fadmin%2Fjuridico%2Fcontratos');
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;
  if (!isPlatformAdminRole(role)) {
    redirect('/anunciante');
  }

  return <ContractsManagementClient />;
}
