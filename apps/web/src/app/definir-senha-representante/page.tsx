import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from '@/lib/commercial/feature-flag';
import { getTempPasswordState } from '@/lib/commercial/temp-password';
import ChangePasswordClient from './change-password-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Definir senha | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function DefinirSenhaRepresentantePage() {
  if (!isCommercialModuleEnvEnabled()) notFound();

  const supabase = await createServerSideClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/login?redirect=/definir-senha-representante');

  const state = getTempPasswordState(data.user.app_metadata);
  if (state === 'none') redirect('/representante');
  if (state === 'expired') redirect('/login?senha_temporaria=expirada');

  return <ChangePasswordClient />;
}
