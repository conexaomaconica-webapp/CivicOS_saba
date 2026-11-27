import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, Layers, Building2, ArrowRight } from 'lucide-react';
import { getPedraFundamentalCampaignAdminStateAction } from '@/app/actions/commercial-campaigns';
import { getPedraFundamentalQuotaAction } from '@/app/actions/institutional-recognitions';
import { PedraCampaignControlCard } from '@/components/admin/PedraCampaignControlCard';

export const metadata = {
  title: 'Campanhas Promocionais — Admin | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminCampanhasPage() {
  const [campaignState, quotaState] = await Promise.all([
    getPedraFundamentalCampaignAdminStateAction(),
    getPedraFundamentalQuotaAction(),
  ]);

  if (!campaignState.success || !campaignState.campaign) {
    if (campaignState.error?.includes('UNAUTHORIZED') || campaignState.error?.includes('não autenticado')) {
      redirect('/login');
    }

    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <h2 className="text-lg font-bold mb-2">Erro de Acesso</h2>
          <p>{campaignState.error || 'Não foi possível carregar as campanhas comerciais.'}</p>
        </div>
      </div>
    );
  }

  const campaign = campaignState.campaign;
  const exceptions = campaignState.exceptions || [];
  const isActive = campaign.status === 'active';
  const isEnded = campaign.status === 'ended' || campaign.status === 'archived';
  const allocatedCount = quotaState?.allocated || campaign.redeemedCount || 0;
  const maxQuota = campaign.maxRedemptions || quotaState?.quota || 30;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
              Gestão Comercial
            </span>
            <span className="text-xs text-stone-500 font-semibold">
              Condições Especiais &amp; Ofertas
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
            Campanhas Promocionais
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
            Gerencie ofertas e condições comerciais especiais, disponibilidade pública/administrativa e exceções auditadas, preservando integralmente contratos emitidos, pagamentos pendentes e reconhecimentos históricos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/planos"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            <Layers className="h-3.5 w-3.5 text-[#3B0B14]" />
            <span>Planos e Valores</span>
          </Link>
          <Link
            href="/admin/empresas/nova"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B0B14] px-3.5 py-2 text-xs font-bold text-[#C9A227] hover:bg-[#520f1c]"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Cadastrar Anunciante</span>
          </Link>
        </div>
      </div>

      {/* KPIs de Resumo */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Campanhas Ativas
          </span>
          <div className="mt-1 text-2xl font-serif font-extrabold text-emerald-700">
            {isActive ? 1 : 0}
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {isActive ? 'Pedra Fundamental em vigor' : 'Nenhuma oferta aberta'}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Campanhas Encerradas / Pausadas
          </span>
          <div className="mt-1 text-2xl font-serif font-extrabold text-stone-900">
            {!isActive ? 1 : 0}
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {isEnded ? 'Novas adesões bloqueadas' : campaign.status === 'paused' ? 'Temporariamente pausada' : '0 encerradas'}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Adesões Pedra Fundamental
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-extrabold text-[#3B0B14]">{allocatedCount}</span>
            <span className="text-xs font-semibold text-stone-500">/ {maxQuota} vagas</span>
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Plano Acácia · Vigência 24 meses
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Exceções Autorizadas
          </span>
          <div className="mt-1 text-2xl font-serif font-extrabold text-amber-800">
            {exceptions.filter((e) => e.status === 'authorized').length}
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {exceptions.filter((e) => e.status === 'consumed').length} já utilizadas com auditoria
          </p>
        </div>
      </section>

      {/* Resumo Estrutural da Campanha */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">Plano vinculado</span>
            <strong className="text-stone-900 text-sm font-bold">Acácia</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Valor promocional</span>
            <strong className="text-stone-900 text-sm font-bold">R$ 1.200,00 à vista · 4x R$ 325,00</strong>
          </div>
          <div>
            <span className="text-stone-500 block">Vigência contratual</span>
            <strong className="text-stone-900 text-sm font-bold">24 meses (Bienal)</strong>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-stone-500 block">Reconhecimento</span>
              <strong className="text-[#3B0B14] text-sm font-bold inline-flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-[#C9A227]" /> Pedra Fundamental
              </strong>
            </div>
            <Link
              href="/admin/empresas"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#3B0B14] hover:underline"
            >
              <span>Ver empresas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Controle Persistente de Disponibilidade e Exceções */}
      <PedraCampaignControlCard
        initialCampaign={campaign}
        initialExceptions={exceptions}
      />
    </main>
  );
}

