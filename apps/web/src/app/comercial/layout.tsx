import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';
import { getAsaasDynamicConfig } from '@/lib/payment/asaas-config-service';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Comercial | Conexão Maçônica',
  description: 'Gestão de representantes, indicações e atribuições comerciais.',
  robots: { index: false, follow: false },
};

export default async function CommercialLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getStaffContext();

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const profile = auth?.user ? await getProfileAuthorization(supabase, auth.user.id) : null;
  const isAdmin = !!profile && isPlatformAdminRole(profile.role);

  // Sem permissão comercial e sem ser administrador da plataforma: a área não existe (404).
  if (!ctx && !isAdmin) notFound();

  // Administrador da plataforma mantém o menu e o cabeçalho do admin ao redor da área comercial.
  const withAdminShell = async (content: React.ReactNode) => {
    if (!isAdmin) return content;
    let isSandbox = false;
    try {
      isSandbox = (await getAsaasDynamicConfig()).environment === 'sandbox';
    } catch {
      isSandbox = false;
    }
    return (
      <AdminShell isSandbox={isSandbox} showCommercial>
        {content}
      </AdminShell>
    );
  };

  // Administrador sem permissão comercial: explica em vez de "página não encontrada".
  if (!ctx) {
    let tenantOk = true;
    try {
      await resolveTenantIdServer();
    } catch {
      tenantOk = false;
    }
    const h = await headers();
    const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]!.trim();
    return withAdminShell(
      <section className="max-w-xl rounded-2xl border border-[#E8E5DF] bg-white p-6 sm:p-8 space-y-3">
        <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Módulo Comercial Nacional</p>
        <h1 className="text-2xl font-serif font-bold text-[#3B0B14]">Acesso comercial necessário</h1>
        {!tenantOk && (
          <p role="alert" className="text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
            Este endereço ({host || 'desconhecido'}) não é reconhecido como domínio verificado de nenhum ambiente, por isso a área comercial não consegue
            identificar o ambiente. Acesse pelo domínio oficial do sistema (o mesmo cadastrado como domínio verificado do tenant).
          </p>
        )}
        <p className="text-sm text-stone-700">
          Ser administrador da plataforma não concede acesso à área comercial. Para abrir esta área é preciso ter uma permissão comercial própria
          (concedida em <strong>Comercial → Acessos</strong>) ou o perfil <strong>master</strong>.
        </p>
        <p className="text-sm text-stone-700">
          Se você deveria ter acesso: peça a um usuário master para conceder a permissão ou confirme que o perfil master está ativo.
        </p>
      </section>,
    );
  }

  const links = [
    { href: '/comercial', label: 'Resumo', show: true },
    { href: '/comercial/representantes', label: 'Representantes', show: staffCan(ctx, 'representatives.read') },
    { href: '/comercial/leads', label: 'Indicações (leads)', show: staffCan(ctx, 'leads.manage') },
    { href: '/comercial/atribuicoes', label: 'Atribuições', show: staffCan(ctx, 'attributions.manage') },
    { href: '/comercial/regras', label: 'Regras', show: staffCan(ctx, 'rules.manage') },
    { href: '/comercial/comissoes', label: 'Comissões', show: staffCan(ctx, 'commissions.read') },
    { href: '/comercial/repasses', label: 'Repasses', show: staffCan(ctx, 'payouts.manage') },
    { href: '/comercial/acessos', label: 'Acessos', show: staffCan(ctx, 'settings.manage') },
    { href: '/comercial/configuracoes', label: 'Configurações', show: staffCan(ctx, 'settings.manage') },
  ].filter((l) => l.show);

  // Dentro do admin: abas simples no topo do conteúdo (o menu lateral do admin já está presente).
  if (isAdmin) {
    return withAdminShell(
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Módulo Comercial Nacional</p>
            <h1 className="text-xl font-serif font-bold text-[#3B0B14] leading-tight">Representantes e Indicações</h1>
          </div>
          {ctx.isMaster && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C9A227]/15 text-[#7a5d0a] border border-[#C9A227]/40">Acesso de recuperação (master)</span>
          )}
        </div>
        <nav aria-label="Navegação comercial" className="flex flex-wrap gap-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded-lg border border-[#E8E5DF] bg-white hover:bg-[#3B0B14] hover:text-white font-semibold transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>,
    );
  }

  // Equipe comercial que não é administradora da plataforma: área própria, sem o menu do admin.
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
