import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepresentativeContext } from '@/lib/commercial/commercial-auth';
import { REPRESENTATIVE_STATUS_LABEL, representativeScopeAllows } from '@/lib/commercial/access-rules';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Área do Representante | Conexão Maçônica',
  description: 'Acompanhe suas indicações e comissões como representante comercial da Conexão Maçônica.',
  robots: { index: false, follow: false },
};

export default async function RepresentativeLayout({ children }: { children: React.ReactNode }) {
  // Sem vínculo de representante (ou módulo desligado): a área simplesmente não existe.
  const ctx = await getRepresentativeContext();
  if (!ctx) notFound();

  const { representative } = ctx;
  const readOnly = !representativeScopeAllows(representative.status, 'operational');
  const displayName = representative.trade_name || representative.legal_name;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900">
      <header className="bg-[#3B0B14] text-white border-b border-[#C9A227]/40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Área do Representante</p>
            <h1 className="text-lg font-serif font-bold leading-tight">{displayName}</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C9A227]/15 text-[#E6C665] border border-[#C9A227]/40">
            {REPRESENTATIVE_STATUS_LABEL[representative.status]}
          </span>
        </div>
        <nav aria-label="Navegação do representante" className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 text-sm">
          <Link href="/representante" className="px-3 py-1.5 rounded-lg hover:bg-white/10 font-semibold">
            Resumo
          </Link>
          <Link href="/representante/comissoes" className="px-3 py-1.5 rounded-lg hover:bg-white/10 font-semibold">
            Comissões
          </Link>
        </nav>
      </header>

      {readOnly && (
        <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
          <p className="max-w-5xl mx-auto px-4 py-3">
            {representative.status === 'suspended' || representative.status === 'terminated'
              ? 'Seu cadastro não está ativo. Você mantém acesso somente leitura ao histórico de comissões e repasses já registrados.'
              : 'Seu cadastro ainda está em análise. As funções de indicação serão liberadas após a aprovação.'}
          </p>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
