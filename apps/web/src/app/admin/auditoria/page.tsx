import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import AuditManagementClient from './audit-management-client';

export const metadata = {
  title: 'Trilha de Auditoria & Governança · Admin CM',
};

export default async function AdminAuditPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fadmin%2Fauditoria');
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#C9A227]/30 pb-4">
        <span className="bg-[#3B0B14] text-[#C9A227] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#C9A227]/40">
          Governança & Rastreabilidade · Painel Admin
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1f1914] mt-2">
          Central de Auditoria Administrativa
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Quem fez o quê, quando, onde e por quê? Trilha imutável com comparativo de estados (Before vs After) e justificativas registradas.
        </p>
      </div>

      <AuditManagementClient />
    </div>
  );
}
