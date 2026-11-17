import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAccountTempPasswordState } from '@/lib/auth/account-temp-password';
import ChangeAccountPasswordClient from './change-account-password-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Definir senha | Conexão Maçônica',
  robots: { index: false, follow: false },
};

/** Troca obrigatória da senha temporária definida pelo administrador (anunciante ou membro). */
export default async function DefinirSenhaPage() {
  const supabase = await createServerSideClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/login?redirect=/definir-senha');

  const state = getAccountTempPasswordState(data.user.app_metadata);
  if (state === 'none') redirect('/');
  if (state === 'expired') redirect('/login?senha_temporaria=conta_expirada');

  return <ChangeAccountPasswordClient />;
}
