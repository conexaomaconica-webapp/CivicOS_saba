'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  MessageCircle,
  Phone,
  Globe,
  MapPin,
  Eye,
  Users,
  Compass,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  AdvertiserResultsDTO,
  TimePeriod,
  getAdvertiserResultsDTOAction,
} from '@/lib/advertiser/advertiser-results-service';
import { CONNECTION_ORIGIN_LABELS, CONNECTION_VALUE_LABELS } from '@/lib/connections/labels';
import type { ConnectionOrigin, ConnectionValueRange } from '@/app/actions/connections';

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function AdvertiserResultsClient({ initialData }: { initialData: AdvertiserResultsDTO }) {
  const [data, setData] = useState<AdvertiserResultsDTO>(initialData);
  const [period, setPeriod] = useState<TimePeriod>(initialData.period);
  const [loading, setLoading] = useState(false);
  const [activeAreaTab, setActiveAreaTab] = useState<'todas' | 'visibilidade' | 'interesse' | 'origens' | 'conexoes'>('todas');

  const {
    kpis,
    funnel,
    dailyEvolution = [],
    trafficOrigins = [],
    acquisitionSources = [],
    discoverySources = [],
    geographicAggregation = [],
    recommendations = [],
    profileDiagnosis,
    business,
    connectionResults,
    valueSummary,
    dataCompleteness,
    lastUpdatedAt,
    timezone,
  } = data;

  const handlePeriodChange = async (newPeriod: TimePeriod) => {
    if (newPeriod === period || loading) return;
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const updated = await getAdvertiserResultsDTOAction(newPeriod);
      setData(updated);
    } catch {
      // Mantém estado anterior em caso de falha de conexão
    } finally {
      setLoading(false);
    }
  };

  const isDataEmpty = kpis.views === 0 && kpis.interactions === 0;
  const results = connectionResults;
  const value = valueSummary;

  const originEntries = results
    ? Object.entries(results.byOrigin).sort((a, b) => b[1] - a[1])
    : [];
  const valueEntries = results
    ? (Object.keys(CONNECTION_VALUE_LABELS) as ConnectionValueRange[])
        .filter((key) => key !== 'nao_informar' && (results.byValueRange[key] ?? 0) > 0)
    : [];

  const renderComparisonBadge = (percent: number) => {
    if (percent === 0) {
      return (
        <span className="text-[10px] text-stone-500 font-medium">
          estável vs período ant.
        </span>
      );
    }
    if (percent > 0) {
      return (
        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
          <ArrowUpRight className="w-3 h-3" /> +{percent}% vs período ant.
        </span>
      );
    }
    return (
      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
        <ArrowDownRight className="w-3 h-3" /> {percent}% vs período ant.
      </span>
    );
  };

  // Cálculo para o gráfico de barras diárias
  const maxDailyViews = Math.max(...dailyEvolution.map((d) => d.views), 1);

  return (
    <div className="space-y-8 text-left pb-12">
      {/* 1. HEADER DA TELA, AUDITORIA & SELETOR DE PERÍODO */}
      <header className="border-b border-stone-200 pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
                Painel do Anunciante • Conexão Maçônica
              </span>
              <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 text-stone-600 rounded-full text-[10px] font-mono">
                Fuso: {timezone || 'America/Sao_Paulo'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Resultados do meu anúncio
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Métricas comerciais auditadas e consolidadas para <strong className="text-stone-800">{business.name}</strong>.
            </p>
          </div>

          {/* SELETOR DE PERÍODO (7d / 30d / 90d) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 font-mono animate-pulse mr-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                Atualizando...
              </span>
            )}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs font-bold font-mono">
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
        </div>

        {/* METADADOS DE AUDITORIA & REGISTRO DE TEMPO */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {lastUpdatedAt && (
              <span className="inline-flex items-center gap-1.5 font-mono text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                Atualizado em:{' '}
                {new Date(lastUpdatedAt).toLocaleString('pt-BR', {
                  timeZone: timezone || 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                (Horário de Brasília)
              </span>
            )}
            <span className="text-stone-400">|</span>
            <span>Período analisado: <strong>{data.periodLabel}</strong></span>
          </div>

          {/* Selo amigável de preservação histórica */}
          {dataCompleteness?.isLegacyDataPresent && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3 text-amber-700" />
              Contém dados históricos integrados com a telemetria canônica
            </span>
          )}
        </div>

        {/* NAVEGAÇÃO RÁPIDA POR ÁREAS OFICIAIS */}
        <div className="flex items-center gap-1.5 pt-2 overflow-x-auto text-xs font-semibold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveAreaTab('todas')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              activeAreaTab === 'todas'
                ? 'bg-[#3B0B14] text-white shadow-2xs'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Todas as Áreas
          </button>
          <button
            type="button"
            onClick={() => setActiveAreaTab('visibilidade')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
              activeAreaTab === 'visibilidade'
                ? 'bg-[#3B0B14] text-white shadow-2xs'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
            1. Visibilidade
          </button>
          <button
            type="button"
            onClick={() => setActiveAreaTab('interesse')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
              activeAreaTab === 'interesse'
                ? 'bg-[#3B0B14] text-white shadow-2xs'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            2. Interesse Comercial
          </button>
          <button
            type="button"
            onClick={() => setActiveAreaTab('origens')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
              activeAreaTab === 'origens'
                ? 'bg-[#3B0B14] text-white shadow-2xs'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            3. Origem dos Visitantes
          </button>
          <button
            type="button"
            onClick={() => setActiveAreaTab('conexoes')}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
              activeAreaTab === 'conexoes'
                ? 'bg-[#3B0B14] text-white shadow-2xs'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#C9A227]" />
            4. Conexões &amp; Resultados
          </button>
        </div>
      </header>

      {/* ESTADO SEM DADOS REAIS */}
      {isDataEmpty ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            Seu anúncio ainda está começando a receber visitas.
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Assim que visitantes e membros abrirem seu perfil e interagirem via WhatsApp, telefone ou rotas, suas métricas aparecerão aqui consolidadas com total transparência e precisão.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/guia/${business.slug}`}
              target="_blank"
              className="px-4 py-2 bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 inline-flex items-center gap-2 hover:bg-[#2b060d] transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Ver meu anúncio no Guia</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ================================================================= */}
          {/* ÁREA 1: VISIBILIDADE (Alcance, Visualizações Totais e Únicos)     */}
          {/* ================================================================= */}
          {(activeAreaTab === 'todas' || activeAreaTab === 'visibilidade') && (
            <section className="space-y-4" aria-labelledby="area-visibilidade">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
                    Área 1 de 4
                  </span>
                  <h2 id="area-visibilidade" className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#C9A227]" />
                    Visibilidade do Anúncio
                  </h2>
                </div>
                <span className="text-xs text-stone-500">
                  Métricas de alcance no {data.periodLabel.toLowerCase()}
                </span>
              </div>

              {/* Indicadores 1 e 2: Visualizações Totais e Visitantes Únicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Visualizações Totais (por atualização / F5) */}
                <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-stone-400" />
                      Visualizações Totais
                    </span>
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-mono">
                      Por atualização
                    </span>
                  </div>
                  <strong className="text-3xl font-serif font-bold text-stone-900 block">
                    {kpis.views.toLocaleString('pt-BR')}
                  </strong>
                  <div className="flex items-center justify-between pt-1">
                    {renderComparisonBadge(kpis.viewsComparisonPercent)}
                    <span className="text-[10px] text-stone-400">Total de cargas de página</span>
                  </div>
                  <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 leading-tight">
                    Computa todas as visualizações do seu perfil (incluindo recargas e acessos recorrentes).
                  </p>
                </div>

                {/* 2. Visitantes Únicos (deduplicados por dispositivo/chave) */}
                <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-stone-400" />
                      Visitantes Únicos
                    </span>
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-mono">
                      Deduplicados
                    </span>
                  </div>
                  <strong className="text-3xl font-serif font-bold text-stone-900 block">
                    {kpis.uniqueVisitors.toLocaleString('pt-BR')}
                  </strong>
                  <div className="flex items-center justify-between pt-1">
                    {renderComparisonBadge(kpis.uniqueVisitorsComparisonPercent)}
                    <span className="text-[10px] text-stone-400">Pessoas / Dispositivos</span>
                  </div>
                  <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 leading-tight">
                    Identificadores únicos no período segundo a chave canônica de integridade.
                  </p>
                </div>

                {/* Síntese de Frequência Média */}
                <div className="p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl shadow-xs space-y-2 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-700" />
                      Frequência de Acesso
                    </span>
                    <span className="text-[10px] font-mono text-amber-800">
                      Engajamento
                    </span>
                  </div>
                  <strong className="text-3xl font-serif font-bold text-amber-950 block">
                    {kpis.uniqueVisitors > 0
                      ? (kpis.views / kpis.uniqueVisitors).toFixed(1).replace('.', ',')
                      : '0'}
                    <span className="text-xs font-normal text-stone-500 ml-1.5">views/visitante</span>
                  </strong>
                  <p className="text-[11px] text-amber-900/80 pt-1 leading-tight">
                    Média de páginas visualizadas por cada pessoa que encontrou o anúncio da sua empresa.
                  </p>
                </div>
              </div>

              {/* Indicador 3: Evolução Temporal dos Acessos */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      3. Evolução Temporal dos Acessos
                    </h3>
                    <p className="text-xs text-stone-500">
                      Visualizações e visitantes únicos distribuídos ao longo do período analisado ({data.periodLabel.toLowerCase()}).
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-[#3B0B14]" />
                      <span className="text-stone-700 font-semibold">Visualizações Totais</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-[#C9A227]" />
                      <span className="text-stone-700 font-semibold">Visitantes Únicos</span>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Barras Responsivo Diário */}
                {dailyEvolution.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    <div className="h-44 sm:h-52 w-full flex items-end gap-1 sm:gap-2 px-1 pt-6 pb-2 border-b border-stone-200 overflow-x-auto">
                      {dailyEvolution.map((d, idx) => {
                        const viewsHeight = Math.max((d.views / maxDailyViews) * 100, 4);
                        const visitorsHeight = Math.max((d.uniqueVisitors / maxDailyViews) * 100, 2);
                        return (
                          <div
                            key={idx}
                            className="flex-1 min-w-[20px] max-w-[40px] flex flex-col items-center justify-end h-full group relative"
                          >
                            {/* Tooltip flutuante no hover */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                              <div className="bg-stone-900 text-white text-[10px] font-mono rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap space-y-0.5">
                                <div className="font-bold text-[#C9A227]">{d.date}</div>
                                <div>{d.views} visualizações</div>
                                <div>{d.uniqueVisitors} visitantes únicos</div>
                                <div className="text-emerald-400 font-bold">{d.interactions} interações</div>
                              </div>
                              <div className="w-2 h-1 bg-stone-900 clip-triangle" />
                            </div>

                            {/* Barras Lado a Lado / Empilhadas Proporcionais */}
                            <div className="w-full flex items-end justify-center gap-0.5 h-full">
                              <div
                                className="w-1/2 bg-[#3B0B14] rounded-t-xs transition-all duration-300 group-hover:brightness-125"
                                style={{ height: `${viewsHeight}%` }}
                                title={`${d.views} views`}
                              />
                              <div
                                className="w-1/2 bg-[#C9A227] rounded-t-xs transition-all duration-300 group-hover:brightness-110"
                                style={{ height: `${visitorsHeight}%` }}
                                title={`${d.uniqueVisitors} únicos`}
                              />
                            </div>

                            {/* Rótulo da data (simplificado para telas menores) */}
                            <span className="text-[9px] font-mono text-stone-400 mt-1.5 truncate max-w-full">
                              {d.date.slice(0, 5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumo tabular dia a dia auditável */}
                    <details className="text-xs group">
                      <summary className="font-semibold text-stone-700 cursor-pointer hover:text-stone-900 py-1 flex items-center justify-between">
                        <span>Ver tabela auditável detalhada dia a dia ({dailyEvolution.length} registros)</span>
                        <span className="text-[11px] text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="max-h-60 overflow-y-auto mt-2 border border-stone-100 rounded-xl divide-y divide-stone-100">
                        {dailyEvolution.map((d, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 hover:bg-stone-50 font-mono text-xs">
                            <span className="font-bold text-stone-700">{d.date}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-stone-800">{d.views} visualizações</span>
                              <span className="text-stone-500">({d.uniqueVisitors} únicos)</span>
                              <span className="text-emerald-700 font-bold">{d.interactions} interações</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 text-center py-6">
                    Ainda não há dados diários suficientes no período selecionado.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ================================================================= */}
          {/* ÁREA 2: INTERESSE COMERCIAL (Os 5 Canais + Funil + Disclaimer)    */}
          {/* ================================================================= */}
          {(activeAreaTab === 'todas' || activeAreaTab === 'interesse') && (
            <section className="space-y-4" aria-labelledby="area-interesse">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
                    Área 2 de 4
                  </span>
                  <h2 id="area-interesse" className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    Interesse Comercial &amp; Ações nos Canais
                  </h2>
                </div>
                <span className="text-xs text-stone-500">
                  Total: <strong>{kpis.interactions.toLocaleString('pt-BR')}</strong> ações
                </span>
              </div>

              {/* Indicadores 4 a 8: Todos os 5 Canais Oficiais Visíveis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* 4. Cliques no WhatsApp Direct */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-950">
                    <span className="font-semibold flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp
                    </span>
                    <span className="text-[9px] font-mono text-emerald-800">Direto</span>
                  </div>
                  <strong className="text-2xl font-serif font-bold text-emerald-800 block">
                    {kpis.whatsappClicks}
                  </strong>
                  {renderComparisonBadge(kpis.whatsappComparisonPercent)}
                  <span className="text-[10px] text-emerald-900/70 block pt-1">
                    Conversas iniciadas
                  </span>
                </div>

                {/* 5. Cliques no Telefone */}
                <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-500" /> Telefone
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">Ligação</span>
                  </div>
                  <strong className="text-2xl font-serif font-bold text-stone-900 block">
                    {kpis.phoneClicks}
                  </strong>
                  {renderComparisonBadge(kpis.phoneComparisonPercent)}
                  <span className="text-[10px] text-stone-500 block pt-1">
                    Discagens iniciadas
                  </span>
                </div>

                {/* 6. Cliques no Website */}
                <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone-500" /> Website
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">Site oficial</span>
                  </div>
                  <strong className="text-2xl font-serif font-bold text-stone-900 block">
                    {kpis.websiteClicks}
                  </strong>
                  {renderComparisonBadge(kpis.websiteComparisonPercent)}
                  <span className="text-[10px] text-stone-500 block pt-1">
                    Visitas ao site
                  </span>
                </div>

                {/* 7. Cliques no Instagram */}
                <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <InstagramIcon className="w-3.5 h-3.5 text-rose-500" /> Instagram
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">Social</span>
                  </div>
                  <strong className="text-2xl font-serif font-bold text-stone-900 block">
                    {kpis.instagramClicks}
                  </strong>
                  {renderComparisonBadge(kpis.instagramComparisonPercent)}
                  <span className="text-[10px] text-stone-500 block pt-1">
                    Acessos ao perfil
                  </span>
                </div>

                {/* 8. Solicitações de Rotas GPS */}
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-amber-950">
                    <span className="font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-700" /> Rotas GPS
                    </span>
                    <span className="text-[9px] font-mono text-amber-800">Presencial</span>
                  </div>
                  <strong className="text-2xl font-serif font-bold text-amber-900 block">
                    {kpis.routeClicks}
                  </strong>
                  {renderComparisonBadge(kpis.routeComparisonPercent)}
                  <span className="text-[10px] text-amber-900/70 block pt-1">
                    Traçados de rota
                  </span>
                </div>
              </div>

              {/* FUNIL DE CONVERSÃO DE INTERESSE */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                      Eficiência do Perfil
                    </span>
                    <h3 className="text-base font-serif font-bold text-stone-900">
                      Funil de Interesse Comercial
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold font-mono">
                    Taxa Geral de Conversão: {kpis.interactionRatePercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                    <span className="text-stone-500 font-mono text-[10px]">ETAPA 1</span>
                    <strong className="text-xl font-bold text-stone-900 block">
                      {funnel.views.toLocaleString('pt-BR')}
                    </strong>
                    <span className="text-stone-600 font-medium text-[11px]">Visualizações Totais</span>
                  </div>

                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                    <span className="text-stone-500 font-mono text-[10px]">ETAPA 2</span>
                    <strong className="text-xl font-bold text-stone-900 block">
                      {funnel.interactions}
                    </strong>
                    <span className="text-stone-600 font-medium text-[11px]">Ações nos Canais</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                    <span className="text-emerald-800 font-mono text-[10px]">ETAPA 3</span>
                    <strong className="text-xl font-bold text-emerald-700 block">
                      {funnel.whatsapp}
                    </strong>
                    <span className="text-emerald-900 font-bold text-[11px]">WhatsApp Direct</span>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
                    <span className="text-amber-800 font-mono text-[10px]">ETAPA 4</span>
                    <strong className="text-xl font-bold text-amber-800 block">
                      {funnel.routes}
                    </strong>
                    <span className="text-amber-900 font-medium text-[11px]">Rotas GPS</span>
                  </div>
                </div>
              </div>

              {/* NOTA OBRIGATÓRIA DE TRANSPARÊNCIA COMERCIAL */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-600 flex items-start gap-3">
                <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-stone-800">
                    Transparência &amp; Diretrizes Comerciais:
                  </p>
                  <p className="text-[11px] leading-relaxed text-stone-600">
                    Métricas de cliques e interações representam interesse manifesto de contato com a sua empresa. Nenhum clique ou visualização garante venda concretizada ou faturamento comercial. As oportunidades geradas dependem do atendimento comercial e fechamento direto entre a sua empresa e os clientes da rede.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================= */}
          {/* ÁREA 3: ORIGEM DOS VISITANTES (Aquisição vs Descoberta)           */}
          {/* ================================================================= */}
          {(activeAreaTab === 'todas' || activeAreaTab === 'origens') && (
            <section className="space-y-4" aria-labelledby="area-origens">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
                    Área 3 de 4
                  </span>
                  <h2 id="area-origens" className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-amber-600" />
                    Origem dos Visitantes (Rastreabilidade)
                  </h2>
                </div>
                <span className="text-xs text-stone-500">
                  Aquisição Externa &amp; Descoberta Interna no Guia
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 9. Origem de Aquisição (Como chegaram à Conexão Maçônica) */}
                <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
                        9. Tráfego Externo
                      </span>
                      <h3 className="text-base font-serif font-bold text-stone-900">
                        Origem de Aquisição
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Como os visitantes chegaram à plataforma Conexão Maçônica.
                      </p>
                    </div>
                    <Globe className="w-4 h-4 text-stone-400" />
                  </div>

                  <div className="space-y-3 text-xs">
                    {acquisitionSources.length > 0 ? (
                      acquisitionSources.map((item) => (
                        <div key={item.source} className="space-y-1">
                          <div className="flex justify-between font-medium text-stone-800">
                            <span>{item.label}</span>
                            <span className="font-mono text-stone-900">
                              {item.percentage}% ({item.count})
                            </span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#3B0B14] rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      trafficOrigins.map((item) => (
                        <div key={item.origin} className="space-y-1">
                          <div className="flex justify-between font-medium text-stone-800">
                            <span>{item.label}</span>
                            <span className="font-mono text-stone-900">
                              {item.percentage}% ({item.count})
                            </span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#3B0B14] rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-500">
                    <strong>Base de cálculo:</strong> Percentual relativo ao total de eventos de tráfego com canal externo identificado no período analisado.
                  </div>
                </div>

                {/* 10. Origem de Descoberta (Onde encontraram a empresa no Guia) */}
                <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider block">
                        10. Navegação Interna
                      </span>
                      <h3 className="text-base font-serif font-bold text-stone-900">
                        Origem de Descoberta
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Em que seção ou ferramenta do Guia a empresa foi encontrada.
                      </p>
                    </div>
                    <Layers className="w-4 h-4 text-[#C9A227]" />
                  </div>

                  <div className="space-y-3 text-xs">
                    {discoverySources.length > 0 ? (
                      discoverySources.map((item) => (
                        <div key={item.source} className="space-y-1">
                          <div className="flex justify-between font-medium text-stone-800">
                            <span>{item.label}</span>
                            <span className="font-mono text-stone-900">
                              {item.percentage}% ({item.count})
                            </span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C9A227] rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-500 py-4 text-center">
                        Origens de descoberta interna em consolidação para este período.
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-500">
                    <strong>Base de cálculo:</strong> Percentual relativo ao total de visualizações internas geradas via pesquisa, mapas, categorias e destaques. Termos de pesquisa digitados por usuários não são expostos por privacidade.
                  </div>
                </div>
              </div>

              {/* Origem Geográfica Agregada (Respeito à LGPD) */}
              {geographicAggregation.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">
                        Privacidade Assegurada (LGPD)
                      </span>
                      <h4 className="text-sm font-serif font-bold text-stone-900">
                        Distribuição Geográfica Agregada por Cidade
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500">
                      Totalmente anônimo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                    {geographicAggregation.map((geo, idx) => (
                      <div key={idx} className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
                        <div className="flex justify-between font-semibold text-stone-800">
                          <span>{geo.city} / {geo.state}</span>
                          <span className="font-mono">{geo.percentage}%</span>
                        </div>
                        <span className="text-[10px] text-stone-500 block">
                          {geo.visitorsCount} {geo.visitorsCount === 1 ? 'acesso' : 'acessos'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ================================================================= */}
          {/* ÁREA 4: CONEXÕES & RESULTADOS DA COMUNIDADE                      */}
          {/* ================================================================= */}
          {(activeAreaTab === 'todas' || activeAreaTab === 'conexoes') && (
            <section className="space-y-4" aria-labelledby="area-conexoes">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
                    Área 4 de 4
                  </span>
                  <h2 id="area-conexoes" className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#C9A227]" />
                    Conexões Declaradas &amp; Resultados na Rede
                  </h2>
                </div>
                <span className="text-xs text-stone-500">
                  Diferente da telemetria de navegação (Base Declaratória)
                </span>
              </div>

              {results && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-4 bg-[#3B0B14] text-[#F9F6F0] rounded-2xl space-y-1 shadow-xs">
                      <span className="text-[#C9A227] font-medium block">Conexões registradas</span>
                      <strong className="text-2xl font-serif font-bold block">{results.registered}</strong>
                      <span className="text-[10px] text-stone-300">No mural de membros</span>
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
                      <span className="text-stone-500 font-medium block">Compras e serviços</span>
                      <strong className="text-2xl font-serif font-bold text-stone-900 block">{results.commercial}</strong>
                      <span className="text-[10px] text-stone-400">Atividades comerciais</span>
                    </div>

                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1 shadow-xs">
                      <span className="text-emerald-900 font-medium block">Confirmadas por você</span>
                      <strong className="text-2xl font-serif font-bold text-emerald-700 block">{results.confirmedCommercial}</strong>
                      {results.pending > 0 && (
                        <span className="text-[10px] text-amber-800 font-bold block">
                          {results.pending} aguardando confirmação
                        </span>
                      )}
                    </div>

                    <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
                      <span className="text-stone-500 font-medium block">Com valor informado</span>
                      <strong className="text-2xl font-serif font-bold text-stone-900 block">{results.withValue}</strong>
                      <span className="text-[10px] text-stone-400">Valores declaratórios</span>
                    </div>
                  </div>

                  {(originEntries.length > 0 || valueEntries.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {originEntries.length > 0 && (
                        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 shadow-xs">
                          <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                            Como as conexões aconteceram
                          </span>
                          {originEntries.map(([key, count]) => (
                            <div key={key} className="flex justify-between text-stone-800 border-b border-stone-50 pb-1">
                              <span>{CONNECTION_ORIGIN_LABELS[key as ConnectionOrigin] ?? key}</span>
                              <strong className="font-mono">{count}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {valueEntries.length > 0 && (
                        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 shadow-xs">
                          <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                            Faixas de valor declaradas por membros
                          </span>
                          {valueEntries.map((key) => (
                            <div key={key} className="flex justify-between text-stone-800 border-b border-stone-50 pb-1">
                              <span>{CONNECTION_VALUE_LABELS[key]}</span>
                              <strong className="font-mono">{results.byValueRange[key]}</strong>
                            </div>
                          ))}
                          <p className="text-[10px] text-stone-400 pt-1">
                            * Valores declarados voluntariamente por membros; não representam faturamento auditado.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-[11px] text-stone-600">
                    <span className="px-3 py-1 bg-stone-100 rounded-full">{results.referrals} indicações recebidas</span>
                    <span className="px-3 py-1 bg-stone-100 rounded-full">{results.shares} compartilhamentos</span>
                    <span className="px-3 py-1 bg-stone-100 rounded-full">{results.benefitClaims} benefícios resgatados</span>
                    <span className="px-3 py-1 bg-stone-100 rounded-full">{results.searchImpressions} aparições no catálogo</span>
                  </div>
                </div>
              )}

              {/* RESUMO DO MÊS E MARCOS HISTÓRICOS */}
              {value && (
                <div className="rounded-3xl border border-[#C9A227]/40 bg-[#FBF7EC] p-6 space-y-4 shadow-xs">
                  <h3 className="text-base font-serif font-bold text-[#3B0B14]">
                    {value.headline}
                  </h3>
                  <ul className="space-y-1.5 text-xs text-stone-800">
                    {value.lines.map((line) => (
                      <li key={line} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  {value.opportunity && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                      <strong>Oportunidade identificada:</strong> {value.opportunity}
                    </div>
                  )}

                  {(value.milestones.length > 0 || value.nextConnectionMilestone) && (
                    <div className="border-t border-[#C9A227]/30 pt-3 space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                        Marcos Alcançados na Conexão Maçônica
                      </span>
                      <ul className="flex flex-wrap gap-2">
                        {value.milestones.slice(-4).map((m) => (
                          <li
                            key={m.key}
                            className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#3B0B14] border border-[#C9A227]/40 shadow-2xs"
                          >
                            {m.title}
                          </li>
                        ))}
                      </ul>
                      {value.nextConnectionMilestone && (
                        <p className="text-[11px] text-stone-600">
                          Faltam {value.nextConnectionMilestone.remaining} conexões para a meta da {value.nextConnectionMilestone.target}ª conexão confirmada.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ================================================================= */}
          {/* DIAGNÓSTICO DO PERFIL & RECOMENDAÇÕES                            */}
          {/* ================================================================= */}
          {profileDiagnosis && (
            <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                    Completude &amp; Qualidade
                  </span>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Diagnóstico do Anúncio
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#3B0B14] text-[#C9A227]">
                  {profileDiagnosis.score}% Completo
                </span>
              </div>

              <div className="space-y-3">
                <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${profileDiagnosis.score}%` }}
                  />
                </div>

                {profileDiagnosis.missingItems.length > 0 ? (
                  <div className="space-y-2 pt-1 text-xs">
                    <p className="font-semibold text-stone-800 text-[11px]">
                      Melhorias recomendadas para maximizar contatos de clientes:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {profileDiagnosis.missingItems.map((item) => (
                        <div
                          key={item.field}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            {item.label}
                          </span>
                          <Link
                            href={item.actionUrl}
                            className="text-[11px] font-bold text-[#3B0B14] underline hover:text-black shrink-0"
                          >
                            Completar
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Parabéns! Seu perfil possui todas as informações essenciais preenchidas.</span>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-0.5">
                        <strong className="font-serif font-bold text-stone-900 block">{rec.title}</strong>
                        <p className="text-[11px] text-stone-600 leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
