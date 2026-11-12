import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSideClient } from '@/lib/supabase/server';
import PushCampaignsClient from './push-campaigns-client';

export const metadata = {
  title: 'Notificações Push · Admin CM',
};

export default async function AdminPushPage() {
  let isUserAuthenticated = false;
  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }
  if (!isUserAuthenticated) redirect('/login?redirect=%2Fadmin%2Fnotificacoes%2Fpush');

  return (
    <div className="space-y-6">
      <div className="border-b border-[#C9A227]/30 pb-4">
        <span className="bg-[#3B0B14] text-[#C9A227] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#C9A227]/40">
          Comunicação & Notificações · Painel Admin
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1f1914] mt-2">Notificações Push no App</h1>
        <p className="text-xs text-stone-500 mt-1">
          Envie comunicados, novidades e destaques para o celular dos membros (Android). Para os avisos automáticos
          por e-mail, veja a{' '}
          <Link href="/admin/notificacoes" className="underline font-semibold text-[#3B0B14]">
            Central Operacional
          </Link>
          .
        </p>
      </div>
      <PushCampaignsClient />
    </div>
  );
}
