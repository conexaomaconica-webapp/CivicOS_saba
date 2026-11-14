import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { createServerSideClient } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Comercial | Conexão Maçônica',
  description: 'Gestão de representantes, indicações e atribuições comerciais.',
  robots: { index: false, follow: false },
};

export default async function CommercialLayout({ children }: { children: React.ReactNode }) {
  // Sem permissão comercial (administrador sem grant inclusive): a área não existe.
  const ctx = await getStaffContext();
  if (!ctx) {
    // Administrador da plataforma logado que chegou aqui pelo menu: explica em vez de "página não encontrada".
    // Qualquer outra pessoa continua recebendo 404 (a área não existe para quem não tem permissão comercial).
    const supabase = await createServerSideClient();
    const { data: auth } = await supabase.auth.getUser();
    const profile = auth?.user ? await getProfileAuthorization(supabase, auth.user.id) : null;
    if (!profile || !isPlatformAdminRole(profile.role)) notFound();
    return (
      <main className="min-h-screen bg-[#FDFBF7] text-stone-900 flex items-center justify-center px-4 py-10">
        <section className="max-w-xl rounded-2xl border border-[#E8E5DF] bg-white p-6 sm:p-8 space-y-3">
          <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Módulo Comercial Nacional</p>
          <h1 className="text-2xl font-serif font-bold text-[#3B0B14]">Acesso comercial necessário</h1>
          <p className="text-sm text-stone-700">
            Ser administrador da plataforma não concede acesso à área comercial. Para abrir esta área é preciso ter uma permissão comercial própria
            (concedida em <strong>Comercial → Acessos</strong>) ou o perfil <strong>master</strong>.
          </p>
          <p className="text-sm text-stone-700">
            Se você deveria ter acesso: peça a um usuário master para conceder a permissão ou confirme que o perfil master está ativo.
            Também confira se o endereço usado é o domínio principal do ambiente.
          </p>
          <Link href="/admin" className="inline-block px-4 py-2 rounded-xl bg-[#3B0B14] text-white text-sm font-bold">Voltar ao admin</Link>
        </section>
      </main>
    );
  }

  const links = [
    { href: '/comercial', label: 'Resumo', show: true },
    { href: '/comercial/representantes', label: 'Representantes', show: staffCan(ctx, 'representatives.read') },
    { href: '/comercial/leads', label: 'Indicações (leads)', show: staffCan(ctx, 'leads.manage') },
    { href: '/comercial/atribuicoes', label: 'Atribuições', show: staffCan(ctx, 'attributions.manage') },
    { href: '/comercial/acessos', label: 'Acessos', show: staffCan(ctx, 'settings.manage') },
    { href: '/comercial/configuracoes', label: 'Configurações', show: staffCan(ctx, 'settings.manage') },
  ].filter((l) => l.show);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900">
      <header className="bg-[#3B0B14] text-white border-b border-[#C9A227]/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Módulo Comercial Nacional</p>
            <h1 className="text-lg font-serif font-bold leading-tight">Representantes e Indicações</h1>
          </div>
          {ctx.isMaster && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C9A227]/15 text-[#E6C665] border border-[#C9A227]/40">
              Acesso de recuperação (master)
            </span>
          )}
        </div>
        <nav aria-label="Navegação comercial" className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap gap-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded-lg hover:bg-white/10 font-semibold">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
