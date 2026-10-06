'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  MessageCircle,
  MapPin,
  Eye,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  AdvertiserResultsDTO,
  TimePeriod,
  getAdvertiserResultsDTOAction,
} from '@/lib/advertiser/advertiser-results-service';
import { CONNECTION_ORIGIN_LABELS, CONNECTION_VALUE_LABELS } from '@/lib/connections/labels';
import type { ConnectionOrigin, ConnectionValueRange } from '@/app/actions/connections';

export default function AdvertiserResultsClient({ initialData }: { initialData: AdvertiserResultsDTO }) {
  const [data, setData] = useState<AdvertiserResultsDTO>(initialData);
  const [period, setPeriod] = useState<TimePeriod>(initialData.period);
  const [loading, setLoading] = useState(false);

  const { kpis, funnel, dailyEvolution, actionRanking, topContent, geographicAggregation, business } = data;

  const handlePeriodChange = async (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
    const updated = await getAdvertiserResultsDTOAction(newPeriod);
    setData(updated);
    setLoading(false);
  };

  const isDataEmpty = kpis.views === 0;
  const results = data.connectionResults;
  const value = data.valueSummary;
  const originEntries = results
    ? Object.entries(results.byOrigin).sort((a, b) => b[1] - a[1])
    : [];
  const valueEntries = results
    ? (Object.keys(CONNECTION_VALUE_LABELS) as ConnectionValueRange[])
        .filter((key) => key !== 'nao_informar' && (results.byValueRange[key] ?? 0) > 0)
    : [];

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & SELETOR DE PERÍODO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Desempenho Comercial • Retorno do Investimento
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Resultados do meu anúncio
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Acompanhe como as pessoas estão encontrando e interajindo com sua empresa.
          </p>
        </div>

        {/* SELETOR DE PERÍODO (7d / 30d / 90d) */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 self-start sm:self-auto text-xs font-bold font-mono">
          <button
            type="button"
            onClick={() => handlePeriodChange('7d')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              period === '7d'
                ? 'bg-[#3B0B14] text-[#C9A227] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            7 dias
          </button>

          <button
            type="button"
            onClick={() => handlePeriodChange('30d')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              period === '30d'
                ? 'bg-[#3B0B14] text-[#C9A227] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            30 dias
          </button>

          <button
            type="button"
            onClick={() => handlePeriodChange('90d')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              period === '90d'
                ? 'bg-[#3B0B14] text-[#C9A227] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {/* RESULTADO: o que a Conexão gerou para a empresa (vem antes de visualizações) */}
      {results && (
        <section className="space-y-3" aria-label="Resultado das conexões">
          <h2 className="text-sm font-serif font-bold text-stone-900">Sua Conexão — {data.periodLabel.toLowerCase()}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-[#3B0B14] text-[#F9F6F0] rounded-2xl space-y-1">
              <span className="text-[#C9A227] font-medium block">Conexões registradas</span>
              <strong className="text-2xl font-serif font-bold block">{results.registered}</strong>
            </div>
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-medium block">Compras e serviços</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">{results.commercial}</strong>
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
              <span className="text-emerald-900 font-medium block">Confirmadas por você</span>
              <strong className="text-2xl font-serif font-bold text-emerald-700 block">{results.confirmedCommercial}</strong>
              {results.pending > 0 && (
                <span className="text-[10px] text-amber-800 font-bold">{results.pending} aguardando sua confirmação</span>
              )}
            </div>
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1">
              <span className="text-stone-500 font-medium block">Negócios declarados</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">{results.commercial}</strong>
              <span className="text-[10px] text-stone-500">{results.withValue} com valor informado (declaratório)</span>
            </div>
          </div>

          {(originEntries.length > 0 || valueEntries.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {originEntries.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500">Como as conexões aconteceram</span>
                  {originEntries.map(([key, count]) => (
                    <div key={key} className="flex justify-between text-stone-800">
                      <span>{CONNECTION_ORIGIN_LABELS[key as ConnectionOrigin] ?? key}</span>
                      <strong className="font-mono">{count}</strong>
                    </div>
                  ))}
                </div>
              )}
              {valueEntries.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500">Faixas de valor declaradas</span>
                  {valueEntries.map((key) => (
                    <div key={key} className="flex justify-between text-stone-800">
                      <span>{CONNECTION_VALUE_LABELS[key]}</span>
                      <strong className="font-mono">{results.byValueRange[key]}</strong>
                    </div>
                  ))}
                  <p className="text-[10px] text-stone-400">Valores informados pelos membros; não representam faturamento auditado.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-[11px] text-stone-600">
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.referrals} indicações</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.shares} compartilhamentos</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.benefitClaims} benefícios resgatados</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.searchImpressions} aparições na busca</span>
          </div>
        </section>
      )}

      {/* RESUMO DE VALOR DO MÊS + MARCOS */}
      {value && (
        <section className="rounded-2xl border border-[#C9A227]/40 bg-[#FBF7EC] p-5 space-y-3" aria-label="Resumo do mês">
          <h2 className="text-sm font-serif font-bold text-[#3B0B14]">{value.headline}</h2>
          <ul className="space-y-1 text-sm text-stone-800">
            {value.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {value.opportunity && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Oportunidade:</strong> {value.opportunity}
            </p>
          )}
          {(value.milestones.length > 0 || value.nextConnectionMilestone) && (
            <div className="border-t border-[#C9A227]/30 pt-3 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">Marcos da sua empresa</span>
              <ul className="flex flex-wrap gap-2">
                {value.milestones.slice(-4).map((m) => (
                  <li key={m.key} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#3B0B14] border border-[#C9A227]/40">
                    {m.title}
                  </li>
                ))}
              </ul>
              {value.nextConnectionMilestone && (
                <p className="text-[11px] text-stone-600">
                  Faltam {value.nextConnectionMilestone.remaining} para a {value.nextConnectionMilestone.target}ª conexão.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ESTADO SEM DADOS (NOVAS EMPRESAS) */}
      {isDataEmpty ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            Seu anúncio ainda está começando a receber visitas.
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Assim que houver movimentação e buscas no Guia, seus resultados e cliques no WhatsApp aparecerão aqui em tempo real.
          </p>
          <Link
            href={`/guia/${business.slug}`}
            target="_blank"
            className="px-4 py-2 bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 inline-flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Ver anúncio no Guia</span>
          </Link>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: CARDS DE VALOR PERCEBIDO DESTACADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-[#3B0B14] text-[#F9F6F0] rounded-3xl border border-[#C9A227]/30 shadow-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C9A227]">
                  WhatsApp Direct • Impacto Comercial
                </span>
                <MessageCircle className="w-5 h-5 text-[#C9A227]" />
              </div>
              <p className="text-lg font-serif font-bold leading-snug">
                &quot;{kpis.whatsappClicks} pessoas abriram seu WhatsApp a partir do seu anúncio nos {data.periodLabel.toLowerCase()}.&quot;
              </p>
              <span className="text-[11px] text-stone-300 font-mono block">
                Conversas iniciadas por clientes e Irmãos da rede
              </span>
            </div>

            <div className="p-5 bg-white text-stone-900 rounded-3xl border border-stone-200 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">
                  Rotas GPS &amp; Localização
                </span>
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-lg font-serif font-bold leading-snug text-stone-900">
                &quot;{kpis.routeClicks} pessoas pediram uma rota até a sede da sua empresa.&quot;
              </p>
              <span className="text-[11px] text-stone-500 font-mono block">
                Intenção real de visita presencial
              </span>
            </div>
          </div>

          {/* SEÇÃO 2: KPIS PRINCIPAIS COM COMPARAÇÃO */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block">Visualizações</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.views.toLocaleString('pt-BR')}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.viewsComparisonPercent}% vs período ant.
              </span>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block">Interações Totais</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.interactions.toLocaleString('pt-BR')}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.interactionsComparisonPercent}% vs período ant.
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-emerald-900 font-medium block">Cliques no WhatsApp</span>
              <strong className="text-2xl font-serif font-bold text-emerald-700 block">
                {kpis.whatsappClicks}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.whatsappComparisonPercent}% vs período ant.
              </span>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block">Como Chegar (Rotas)</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.routeClicks}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.routeComparisonPercent}% vs período ant.
              </span>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block">Visitas ao Site</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.websiteClicks}
              </strong>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.websiteComparisonPercent}% vs período ant.
              </span>
            </div>
          </div>

          {/* SEÇÃO 3: FUNIL DE INTERESSE & TAXA DE CONVERSÃO */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                  Jornada do Cliente no Guia
                </span>
                <h2 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
                  Funil de Interesse do Anúncio
                </h2>
              </div>

              <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                Taxa de Interação: {kpis.interactionRatePercent}% das visualizações
              </span>
            </div>

            {/* REPRESENTAÇÃO VISUAL DO FUNIL */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-stone-500 font-mono text-[10px]">1. ALCANCE</span>
                <strong className="text-xl font-bold text-stone-900 block">{funnel.views.toLocaleString('pt-BR')}</strong>
                <span className="text-stone-600 font-medium">Visualizações</span>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-stone-500 font-mono text-[10px]">2. INTERAÇÃO</span>
                <strong className="text-xl font-bold text-stone-900 block">{funnel.interactions}</strong>
                <span className="text-stone-600 font-medium">Interações Totais</span>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-emerald-800 font-mono text-[10px]">3. CONTATO DIRETO</span>
                <strong className="text-xl font-bold text-emerald-700 block">{funnel.whatsapp}</strong>
                <span className="text-emerald-900 font-bold">WhatsApp Direct</span>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-stone-500 font-mono text-[10px]">4. VISITA PRESENCIAL</span>
                <strong className="text-xl font-bold text-stone-900 block">{funnel.routes}</strong>
                <span className="text-stone-600 font-medium">Rotas GPS</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: EVOLUÇÃO DIÁRIA & RANKING DE AÇÕES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* EVOLUÇÃO DIÁRIA */}
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Evolução Diária de Acessos
              </h2>

              <div className="space-y-2">
                {dailyEvolution.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 border-b border-stone-100">
                    <span className="text-stone-500 font-bold">{d.date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-stone-800 font-medium">{d.views} visualizações</span>
                      <span className="text-emerald-700 font-bold">{d.interactions} interações</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RANKING DE AÇÕES */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" /> Principais Ações dos Clientes
              </h2>

              <div className="space-y-3 text-xs">
                {actionRanking.map((act, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-between">
                    <span className="font-semibold text-stone-800">{act.label}</span>
                    <strong className="font-mono text-base text-[#3B0B14]">{act.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: CONTEÚDO COM MELHOR DESEMPENHO & ORIGEM GEOGRÁFICA AGREGADA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CONTEÚDO TOP */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
                Conteúdo com Melhor Desempenho
              </h2>

              <div className="space-y-3 text-xs">
                {topContent.topService && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-800 uppercase">Serviço Mais Visualizado</span>
                    <strong className="font-bold text-stone-900 block">{topContent.topService.title}</strong>
                    <span className="text-[11px] text-stone-500 font-mono">{topContent.topService.views} visualizações</span>
                  </div>
                )}

                {topContent.topBenefit && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase">Oferta Fraterna Mais Acessada</span>
                    <strong className="font-bold text-emerald-950 block">{topContent.topBenefit.title}</strong>
                    <span className="text-[11px] text-emerald-700 font-mono">{topContent.topBenefit.clicks} resgates iniciados</span>
                  </div>
                )}
              </div>
            </div>

            {/* ORIGEM GEOGRÁFICA AGREGADA (SEM IP OU RASTREIO INDIVIDUAL) */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-base font-serif font-bold text-stone-900">
                  Origem Geográfica Agregada
                </h2>
                <span className="text-[10px] font-mono text-stone-400">Privacidade Garantida</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {geographicAggregation.map((geo, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-semibold text-stone-800">
                      <span>{geo.city} / {geo.state}</span>
                      <span className="font-mono text-stone-900">{geo.percentage}% ({geo.visitorsCount} acessos)</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${geo.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
