import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  MessageCircle,
  MapPin,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Compass,
  Info,
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

  const {
    kpis,
    funnel,
    dailyEvolution,
    trafficOrigins = [],
    actionRanking = [],
    geographicAggregation = [],
    recommendations = [],
    profileDiagnosis,
    business,
    lastUpdatedAt,
    timezone,
  } = data;

  const handlePeriodChange = async (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
    const updated = await getAdvertiserResultsDTOAction(newPeriod);
    setData(updated);
    setLoading(false);
  };

  const isDataEmpty = kpis.views === 0 && kpis.interactions === 0;
  const results = data.connectionResults;
  const value = data.valueSummary;
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

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA & SELETOR DE PERÍODO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Painel de Inteligência Comercial • Conexão Maçônica
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Resultados do meu anúncio
          </h1>
          <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
            <span>Métricas comerciais auditadas e consolidadas para <strong>{business.name}</strong>.</span>
            {lastUpdatedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-stone-400" />
                Atualizado: {new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { timeZone: timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })} BRT
              </span>
            )}
          </div>
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

      {/* RESULTADO DAS CONEXÕES NO MURAL (QUANDO DISPONÍVEL) */}
      {results && (
        <section className="space-y-3" aria-label="Resultado das conexões">
          <h2 className="text-sm font-serif font-bold text-stone-900">Sua Conexão na Rede — {data.periodLabel.toLowerCase()}</h2>
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
              <span className="text-[10px] text-stone-500">{results.withValue} com valor informado</span>
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
                  <p className="text-[10px] text-stone-400">Valores declaratórios informados por membros; não representam faturamento auditado.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-[11px] text-stone-600">
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.referrals} indicações</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.shares} compartilhamentos</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.benefitClaims} benefícios resgatados</span>
            <span className="px-3 py-1 bg-stone-100 rounded-full">{results.searchImpressions} aparições no catálogo</span>
          </div>
        </section>
      )}

      {/* RESUMO DO MÊS E MARCOS */}
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

      {/* ESTADO SEM DADOS REAIS (NOVAS EMPRESAS SEM ACESSOS) */}
      {isDataEmpty ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-stone-900">
            Seu anúncio ainda está começando a receber visitas.
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Assim que visitantes e membros abrirem seu perfil e interagirem via WhatsApp, telefone ou rotas, suas métricas aparecerão aqui consolidadas com total transparência.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/guia/${business.slug}`}
              target="_blank"
              className="px-4 py-2 bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Ver anúncio no Guia</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: CARDS DE VALOR PERCEBIDO COM CANAIS PRINCIPAIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-[#3B0B14] text-[#F9F6F0] rounded-3xl border border-[#C9A227]/30 shadow-lg space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C9A227]">
                  WhatsApp Direct • Impacto Comercial
                </span>
                <MessageCircle className="w-5 h-5 text-[#C9A227]" />
              </div>
              <p className="text-lg font-serif font-bold leading-snug">
                &quot;{kpis.whatsappClicks} {kpis.whatsappClicks === 1 ? 'conversa iniciada' : 'conversas iniciadas'} via WhatsApp nos {data.periodLabel.toLowerCase()}.&quot;
              </p>
              <span className="text-[11px] text-stone-300 font-mono block">
                Contatos diretos iniciados por clientes e membros da rede
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
                &quot;{kpis.routeClicks} {kpis.routeClicks === 1 ? 'solicitação de rota' : 'solicitações de rota'} para o seu endereço.&quot;
              </p>
              <span className="text-[11px] text-stone-500 font-mono block">
                Intenção real de visita presencial ao seu estabelecimento
              </span>
            </div>
          </div>

          {/* SEÇÃO 2: KPIS PRINCIPAIS (VISUALIZAÇÕES, VISITANTES ÚNICOS E CANAIS) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block">Visualizações</span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.views.toLocaleString('pt-BR')}
              </strong>
              {renderComparisonBadge(kpis.viewsComparisonPercent)}
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-400" /> Visitantes Únicos
              </span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.uniqueVisitors.toLocaleString('pt-BR')}
              </strong>
              {renderComparisonBadge(kpis.uniqueVisitorsComparisonPercent)}
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-emerald-900 font-medium block flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </span>
              <strong className="text-2xl font-serif font-bold text-emerald-700 block">
                {kpis.whatsappClicks}
              </strong>
              {renderComparisonBadge(kpis.whatsappComparisonPercent)}
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Rotas GPS
              </span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.routeClicks}
              </strong>
              {renderComparisonBadge(kpis.routeComparisonPercent)}
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-1 shadow-xs">
              <span className="text-stone-500 font-medium block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" /> Interações Totais
              </span>
              <strong className="text-2xl font-serif font-bold text-stone-900 block">
                {kpis.interactions.toLocaleString('pt-BR')}
              </strong>
              {renderComparisonBadge(kpis.interactionsComparisonPercent)}
            </div>
          </div>

          {/* NOTA DE TRANSPARÊNCIA COMERCIAL */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-stone-800">Nota de Transparência Comercial:</p>
              <p className="text-[11px] leading-relaxed text-stone-500">
                O total de interações reúne WhatsApp, solicitações de rota, website, chamadas e redes sociais. Cliques indicam interesse e intenção de contato, não correspondendo necessariamente a negócios fechados ou vendas concluídas.
              </p>
            </div>
          </div>

          {/* SEÇÃO 3: ORIGEM DOS ACESSOS & FUNIL DE INTERESSE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ORIGEM DOS ACESSOS (SOLICITADA NO MOCK) */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                    Canais de Descoberta
                  </span>
                  <h2 className="text-base font-serif font-bold text-stone-900">
                    Origem dos Acessos
                  </h2>
                </div>
                <Compass className="w-4 h-4 text-[#C9A227]" />
              </div>

              <div className="space-y-3 text-xs">
                {trafficOrigins.map((item) => (
                  <div key={item.origin} className="space-y-1">
                    <div className="flex justify-between font-semibold text-stone-800">
                      <span>{item.label}</span>
                      <span className="font-mono text-stone-900">{item.percentage}% ({item.count})</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3B0B14] rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FUNIL DE INTERESSE DO ANÚNCIO */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                    Conversão do Anúncio
                  </span>
                  <h2 className="text-base font-serif font-bold text-stone-900">
                    Funil de Interesse
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-[10px] font-bold">
                  Taxa de Conversão: {kpis.interactionRatePercent}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                  <span className="text-stone-500 font-mono text-[10px]">1. ALCANCE</span>
                  <strong className="text-xl font-bold text-stone-900 block">{funnel.views.toLocaleString('pt-BR')}</strong>
                  <span className="text-stone-600 font-medium text-[11px]">Visualizações Totais</span>
                </div>

                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                  <span className="text-stone-500 font-mono text-[10px]">2. INTERAÇÃO</span>
                  <strong className="text-xl font-bold text-stone-900 block">{funnel.interactions}</strong>
                  <span className="text-stone-600 font-medium text-[11px]">Ações nos Canais</span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-emerald-800 font-mono text-[10px]">3. CONTATO DIRETO</span>
                  <strong className="text-xl font-bold text-emerald-700 block">{funnel.whatsapp}</strong>
                  <span className="text-emerald-900 font-bold text-[11px]">WhatsApp Direct</span>
                </div>

                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                  <span className="text-stone-500 font-mono text-[10px]">4. VISITA PRESENCIAL</span>
                  <strong className="text-xl font-bold text-stone-900 block">{funnel.routes}</strong>
                  <span className="text-stone-600 font-medium text-[11px]">Rotas GPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: EVOLUÇÃO DIÁRIA & RANKING DE AÇÕES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* EVOLUÇÃO DIÁRIA COM DATAS REAIS */}
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Evolução Diária no Período
                </h2>
                <span className="text-[11px] font-mono text-stone-400">Datas reais do calendário</span>
              </div>

              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {dailyEvolution.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-lg hover:bg-stone-50 transition border-b border-stone-100">
                    <span className="text-stone-600 font-bold">{d.date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-stone-800 font-medium">{d.views} visualizações</span>
                      <span className="text-stone-500">({d.uniqueVisitors} únicos)</span>
                      <span className="text-emerald-700 font-bold">{d.interactions} interações</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RANKING DE AÇÕES REAL */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" /> Ações por Canal
              </h2>

              <div className="space-y-2 text-xs">
                {actionRanking.map((act, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center justify-between">
                    <span className="font-semibold text-stone-800">{act.label}</span>
                    <strong className="font-mono text-base text-[#3B0B14]">{act.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: DIAGNÓSTICO DO PERFIL & ORIGEM GEOGRÁFICA REAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DIAGNÓSTICO DE COMPLETUDE DO CADASTRO */}
            {profileDiagnosis && (
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
                      Qualidade do Anúncio
                    </span>
                    <h2 className="text-base font-serif font-bold text-stone-900">
                      Diagnóstico do Perfil
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#3B0B14] text-[#C9A227]">
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
                        Melhorias sugeridas para aumentar contatos:
                      </p>
                      {profileDiagnosis.missingItems.map((item) => (
                        <div key={item.field} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            {item.label}
                          </span>
                          <Link href={item.actionUrl} className="text-[11px] font-bold text-[#3B0B14] underline hover:text-black">
                            Completar
                          </Link>
                        </div>
                      ))}
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
              </div>
            )}

            {/* ORIGEM GEOGRÁFICA AGREGADA REAL */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 block uppercase">Privacidade Garantida</span>
                  <h2 className="text-base font-serif font-bold text-stone-900">
                    Origem Geográfica Agregada
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-stone-500">Dados Consolidados</span>
              </div>

              {geographicAggregation.length > 0 ? (
                <div className="space-y-3 text-xs">
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
              ) : (
                <div className="p-6 text-center text-xs text-stone-500 space-y-1.5">
                  <MapPin className="w-6 h-6 text-stone-300 mx-auto" />
                  <p className="font-medium text-stone-700">Origens em consolidação regional</p>
                  <p className="text-[11px] text-stone-400">
                    As cidades com maior volume de acessos aparecerão aqui conforme as pessoas abrirem o perfil da sua empresa.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
