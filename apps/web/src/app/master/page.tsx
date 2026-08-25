import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import MasterDashboardClient from './master-dashboard-client';

export const metadata = {
  title: 'Torre de Controle — Dashboard de Engenharia | Conexão Maçônica',
};

export default async function MasterDashboardPage() {
  let isSuperAdmin = false;

  try {
    const supabase = await createServerSideClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      const role = profile?.role || userData.user.user_metadata?.role;
      isSuperAdmin = role === 'master' || role === 'superadmin' || role === 'socio_admin';
    }
  } catch (_e) {
    isSuperAdmin = false;
  }

  if (!isSuperAdmin) {
    redirect('/login?redirect=%2Fmaster');
  }

  return <MasterDashboardClient />;
}
