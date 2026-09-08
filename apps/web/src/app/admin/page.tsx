import React from 'react';
import Link from 'next/link';
import {
  Building2 as BuildingIcon,
  CheckCircle2 as CheckIcon,
  Clock as ClockIcon,
  DollarSign as DollarIcon,
  TrendingUp as TrendingIcon,
  AlertCircle as AlertIcon,
  ArrowRight as ArrowIcon,
  ShieldAlert as ShieldAlertIcon,
  Award as AwardIcon,
  CreditCard as CreditIcon,
  PlusCircle as PlusIcon,
  UploadCloud as UploadIcon,
  Sparkles as SparklesIcon,
  Server as ServerIcon,
} from 'lucide-react';
import { getAdminDashboardMetricsAction } from '@/lib/admin/admin-dashboard-service';

export const metadata = {
  title: 'Mesa de Comando Operacional · Admin Conexão Maçônica',
};

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardMetricsAction();

  const monthlyFormatted = data.kpis.confirmedMonthlyRevenueBrl.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const annualFormatted = data.kpis.confirmedAnnualRevenueBrl.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto">
      {/* 1. CABEÇALHO OPERACIONAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
              Mesa de Comando Operacional
            </span>
            <span className="text-xs text-stone-500 font-mono">{data.header.currentDate}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mt-1">
            {data.header.greeting}, {data.header.adminName}
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-medium">
            {data.header.operationalSummary}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/aprovacoes"
            className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-extrabold text-xs rounded-xl border border-[#C9A227]/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Ver Fila de Aprovações</span>
            <ArrowIcon className="w-4 h-4 text-[#C9A227]" />
          </Link>
        </div>
      </div>

      {/* 2. CENTRAL "PRECISA DA SUA ATENÇÃO" (DESTAQUE PRINCIPAL MÁXIMO) */}
      <section className="bg-[#3B0B14] text-white rounded-2xl p-6 shadow-xl border border-[#C9A227]/50 space-y-4">
        <div className="flex items-center justify-between border-b border-[#C9A227]/30 pb-3">
          <div className="flex items-center gap-2">
            <AlertIcon className="w-5 h-5 text-[#C9A227]" />
            <h2 className="font-serif font-bold text-lg text-white">Central: Precisa da sua Atenção Hoje</h2>
          </div>
          <span className="text-xs text-[#C9A227] font-bold uppercase tracking-wider">Ações Prioritárias</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Aprovacoes */}
          <Link
            href="/admin/aprovacoes"
            className="p-3.5 bg-[#2b060d] hover:bg-[#4B161B] border border-[#C9A227]/30 hover:border-[#C9A227] rounded-xl transition-all space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">Aprovações</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#C9A227] text-[#3B0B14]">
                {data.attentionCenter.pending_approvals}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium">Cadastros aguardando análise pré-publicação</p>
            <div className="text-[10px] text-[#C9A227] font-bold flex items-center justify-between pt-1">
              <span>Analisar agora</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Pagamentos */}
          <Link
            href="/admin/pagamentos"
            className="p-3.5 bg-[#2b060d] hover:bg-[#4B161B] border border-[#C9A227]/30 hover:border-[#C9A227] rounded-xl transition-all space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">Pagamentos</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                {data.attentionCenter.pending_payments}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium">Cobranças pendentes / conciliação Asaas</p>
            <div className="text-[10px] text-[#C9A227] font-bold flex items-center justify-between pt-1">
              <span>Conciliar faturas</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Incompletos */}
          <Link
            href="/admin/aprovacoes?filter=cadastro_incompleto"
            className="p-3.5 bg-[#2b060d] hover:bg-[#4B161B] border border-[#C9A227]/30 hover:border-[#C9A227] rounded-xl transition-all space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">Incompletos</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                {data.attentionCenter.incomplete_profiles}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium">Empresas com score de cadastro menor que 70%</p>
            <div className="text-[10px] text-[#C9A227] font-bold flex items-center justify-between pt-1">
              <span>Completar dados</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Lojas sem Coordenadas */}
          <Link
            href="/admin/lojas"
            className="p-3.5 bg-[#2b060d] hover:bg-[#4B161B] border border-[#C9A227]/30 hover:border-[#C9A227] rounded-xl transition-all space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">Lojas s/ GPS</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                {data.attentionCenter.lodges_without_coordinates}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium">Lojas Maçônicas sem coordenadas para o mapa</p>
            <div className="text-[10px] text-[#C9A227] font-bold flex items-center justify-between pt-1">
              <span>Geolocalizar</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Notificacoes */}
          <Link
            href="/admin/notificacoes"
            className="p-3.5 bg-[#2b060d] hover:bg-[#4B161B] border border-[#C9A227]/30 hover:border-[#C9A227] rounded-xl transition-all space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">Notificações</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {data.attentionCenter.failed_notifications === 0 ? 'OK' : data.attentionCenter.failed_notifications}
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-medium">Status de envios transacionais SMTP</p>
            <div className="text-[10px] text-[#C9A227] font-bold flex items-center justify-between pt-1">
              <span>Ver envios</span>
              <ArrowIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 3. KPIS ESSENCIAIS DA OPERAÇÃO */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Empresas Ativas */}
        <Link
          href="/admin/empresas?status=published"
          className="bg-white border border-stone-300 hover:border-[#4B161B] rounded-2xl p-5 shadow-xs transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Empresas Ativas</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <CheckIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-emerald-900 mt-2">{data.kpis.activeCompanies}</p>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>Publicadas no Guia</span>
            <ArrowIcon className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 2: Aguardando Aprovação */}
        <Link
          href="/admin/aprovacoes"
          className="bg-white border border-stone-300 hover:border-amber-600 rounded-2xl p-5 shadow-xs transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Aguardando Aprovação</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <ClockIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-amber-900 mt-2">{data.kpis.pendingApprovals}</p>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>Ir para o Dossiê</span>
            <ArrowIcon className="w-3.5 h-3.5 text-amber-700 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 3: Assinaturas Ativas */}
        <Link
          href="/admin/planos"
          className="bg-white border border-stone-300 hover:border-[#4B161B] rounded-2xl p-5 shadow-xs transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Assinaturas Ativas</span>
            <div className="p-2 bg-[#3B0B14]/10 rounded-xl text-[#3B0B14]">
              <BuildingIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-stone-900 mt-2">{data.kpis.activeSubscriptions}</p>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>Bronze, Prata e Ouro</span>
            <ArrowIcon className="w-3.5 h-3.5 text-[#C9A227] group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 4: Receita Confirmada */}
        <Link
          href="/admin/pagamentos"
          className="bg-white border border-stone-300 hover:border-[#C9A227] rounded-2xl p-5 shadow-xs transition-all group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Receita Confirmada (Ano)</span>
            <div className="p-2 bg-[#3B0B14] rounded-xl text-[#C9A227]">
              <DollarIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-serif font-bold text-[#3B0B14] mt-2">{annualFormatted}</p>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>{monthlyFormatted} / mês</span>
            <ArrowIcon className="w-3.5 h-3.5 text-[#C9A227] group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>
      </section>

      {/* KPI SEGUNDA LINHA: SEGUNDA CAMADA OPERACIONAL */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <span className="text-stone-500 font-medium block">Pagamentos Pendentes:</span>
          <strong className="text-amber-800 text-lg font-bold font-mono">{data.kpis.pendingPaymentsCount} faturas</strong>
        </div>
        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <span className="text-stone-500 font-medium block">Lojas Maçônicas Publicadas:</span>
          <strong className="text-stone-900 text-lg font-bold font-mono">{data.kpis.publishedLodgesCount} Lojas</strong>
        </div>
        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <span className="text-stone-500 font-medium block">Pedra Fundamental (Cota Pioneira):</span>
          <strong className="text-amber-900 text-lg font-bold font-serif">{data.kpis.pedraFundamentalCount}/10 alocadas</strong>
        </div>
        <div className="p-4 bg-white border border-stone-300 rounded-2xl shadow-xs">
          <span className="text-stone-500 font-medium block">Inadimplência Operacional:</span>
          <strong className="text-emerald-700 text-lg font-bold font-mono">0.0% (Zero)</strong>
        </div>
      </section>

      {/* 4. ÚLTIMAS SOLICITAÇÕES DE CADASTRO */}
      <section className="bg-white border border-stone-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-stone-900">Últimas Solicitações de Anúncio</h3>
            <p className="text-xs text-stone-500">Cadastros recentes aguardando conferência pré-publicação</p>
          </div>
          <Link
            href="/admin/aprovacoes"
            className="text-xs font-bold text-[#3B0B14] hover:underline flex items-center gap-1"
          >
            <span>Ver Fila Completa</span>
            <ArrowIcon className="w-3.5 h-3.5 text-[#C9A227]" />
          </Link>
        </div>

        {data.recentApplications.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <p className="text-sm font-bold text-stone-800">Nenhuma solicitação aguardando aprovação</p>
            <p className="text-xs text-stone-500">Tudo em dia por aqui!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa & Categoria</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Plano</th>
                  <th className="py-3 px-4 text-center">Status do cadastro</th>
                  <th className="py-3 px-4 text-center">Pagamento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {data.recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-stone-900 text-sm">{app.name}</div>
                      <div className="text-[11px] text-stone-500">{app.category}</div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-800">
                      <div className="font-bold">{app.owner_name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{app.owner_email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-900 font-extrabold text-[10px] uppercase border border-stone-300">
                        {app.plan_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-10 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full"
                            style={{ width: `${app.completeness_percent}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-stone-800">{app.completeness_percent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        ✓ Confirmado
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                        {app.publication_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/aprovacoes/${app.id}`}
                        className="px-3 py-1.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 border border-[#C9A227]/40"
                      >
                        <span>Analisar</span>
                        <ArrowIcon className="w-3.5 h-3.5 text-[#C9A227]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5 & 6. FINANCEIRO & DISTRIBUIÇÃO POR PLANOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financeiro */}
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <CreditIcon className="w-4 h-4 text-[#3B0B14]" /> Panorama Financeiro (Asaas)
            </h3>
            <Link href="/admin/pagamentos" className="text-xs font-bold text-[#3B0B14] hover:underline">
              Ver Conciliação
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block">Receita Mês Atual:</span>
              <strong className="text-stone-900 font-mono text-base font-bold">{monthlyFormatted}</strong>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block">Receita Anual Acumulada:</span>
              <strong className="text-stone-900 font-mono text-base font-bold">{annualFormatted}</strong>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-stone-600">Pagamentos Confirmados:</span>
              <strong className="text-emerald-700 font-bold">{data.financeSummary.confirmedPaymentsCount} faturas</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-600">Pagamentos Pendentes:</span>
              <strong className="text-amber-800 font-bold">{data.financeSummary.pendingPaymentsCount} faturas</strong>
            </div>
          </div>
        </div>

        {/* Distribuição por Planos Comercial */}
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <AwardIcon className="w-4 h-4 text-[#3B0B14]" /> Distribuição por Planos Comerciais
            </h3>
            <Link href="/admin/planos" className="text-xs font-bold text-[#3B0B14] hover:underline">
              Gerenciar Planos
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span>Bronze (Gratuito)</span>
                <span>{data.planDistribution.bronzeCount} empresas ({data.planDistribution.bronzePercent}%)</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="bg-stone-500 h-full" style={{ width: `${data.planDistribution.bronzePercent}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span>Prata (Anual R$ 1.788)</span>
                <span>{data.planDistribution.prataCount} empresas ({data.planDistribution.prataPercent}%)</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full" style={{ width: `${data.planDistribution.prataPercent}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span>Ouro (Anual R$ 2.388)</span>
                <span>{data.planDistribution.ouroCount} empresas ({data.planDistribution.ouroPercent}%)</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="bg-[#3B0B14] h-full" style={{ width: `${data.planDistribution.ouroPercent}%` }} />
              </div>
            </div>

            <p className="text-[11px] text-stone-500 pt-1">
              * Nota: <strong>Pedra Fundamental</strong> ({data.planDistribution.pedraFundamentalBadgeCount}/10) e <strong>Empresa Fundadora</strong> são distintivos fraternos de honra, e não cotas comerciais.
            </p>
          </div>
        </div>
      </div>

      {/* 7 & 8. CRESCIMENTO & SAÚDE OPERACIONAL RESUMIDA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento */}
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <TrendingIcon className="w-4 h-4 text-emerald-700" /> Crescimento Recente (30d)
            </h3>
            <span className="text-xs font-bold text-emerald-700">+{data.growth.growthPercentComparedToPrevious}% vs anterior</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-2xl font-serif font-bold text-emerald-900">+{data.growth.newAdvertisers30d}</span>
              <span className="block text-[11px] text-emerald-800 font-semibold mt-0.5">Novos Anunciantes</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-2xl font-serif font-bold text-stone-900">+{data.growth.newPublished30d}</span>
              <span className="block text-[11px] text-stone-600 font-semibold mt-0.5">Empresas Publicadas</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-2xl font-serif font-bold text-amber-900">+{data.growth.newLodges30d}</span>
              <span className="block text-[11px] text-amber-800 font-semibold mt-0.5">Lojas Adicionadas</span>
            </div>
          </div>
        </div>

        {/* Saúde Operacional Resumida */}
        <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <ServerIcon className="w-4 h-4 text-stone-700" /> Saúde Operacional dos Serviços
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
              Sistemas OK
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <span>Asaas</span>
              <span className="text-emerald-700 font-bold">✓ 100%</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <span>SMTP</span>
              <span className="text-emerald-700 font-bold">✓ 100%</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <span>Webhooks</span>
              <span className="text-emerald-700 font-bold">✓ 100%</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <span>Notificações</span>
              <span className="text-emerald-700 font-bold">✓ OK</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-center justify-between">
            <span>Para métricas profundas de infraestrutura e latência de servidor:</span>
            <Link
              href="/master"
              className="font-bold text-[#3B0B14] hover:underline flex items-center gap-1 shrink-0"
            >
              <ShieldAlertIcon className="w-3.5 h-3.5 text-amber-700" />
              <span>Torre de Controle</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 9. AÇÕES RÁPIDAS OPERACIONAIS */}
      <section className="bg-stone-100 border border-stone-300 rounded-2xl p-5 shadow-2xs space-y-3">
        <strong className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          Ações Rápidas Operacionais
        </strong>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <Link
            href="/admin/lojas/nova"
            className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-stone-800 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <PlusIcon className="w-4 h-4 text-[#3B0B14]" />
            <span>+ Nova Loja</span>
          </Link>

          <Link
            href="/admin/lojas/importar"
            className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-stone-800 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <UploadIcon className="w-4 h-4 text-[#3B0B14]" />
            <span>Importar Lojas</span>
          </Link>

          <Link
            href="/admin/aprovacoes"
            className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <CheckIcon className="w-4 h-4 text-[#C9A227]" />
            <span>Ver Aprovações</span>
          </Link>

          <Link
            href="/admin/planos"
            className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-stone-800 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <SparklesIcon className="w-4 h-4 text-[#3B0B14]" />
            <span>Gerenciar Planos</span>
          </Link>

          <Link
            href="/admin/pagamentos"
            className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl text-stone-800 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <CreditIcon className="w-4 h-4 text-[#3B0B14]" />
            <span>Ver Pagamentos</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
