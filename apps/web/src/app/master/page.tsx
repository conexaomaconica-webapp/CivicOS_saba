import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
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
      const profile = await getProfileAuthorization(supabase, userData.user.id);

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
