'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  MessageCircle,
  Phone,
  Globe,
  MapPin,
  BarChart3,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';
import { getAdvertiserAnalyticsSummaryAction, AnalyticsSummary } from '@/lib/analytics/analytics-service';

type AdvertiserAnalyticsDashboardProps = {
  businessId: string;
};

export default function AdvertiserAnalyticsDashboard({ businessId }: AdvertiserAnalyticsDashboardProps) {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const data = await getAdvertiserAnalyticsSummaryAction(businessId, days);
        setSummary(data);
      } catch (_err) {
        // Fallback gracioso
      } finally {
        setLoading(false);
      }
    }
    void loadAnalytics();
  }, [businessId, days]);

  if (loading) {
    return (
      <div className="p-8 bg-stone-900/60 border border-stone-800 rounded-2xl text-center space-y-3">
        <BarChart3 className="w-8 h-8 text-[#C9A227] animate-pulse mx-auto" />
        <p className="text-xs font-semibold text-stone-400">Carregando métricas comerciais de desempenho...</p>
      </div>
    );
  }

  // Estado sem dados suficientes (Empresa Nova)
  if (!summary || !summary.has_data) {
    return (
      <div className="p-8 bg-[#3B0B14]/30 border border-[#C9A227]/30 rounded-2xl text-center space-y-4 shadow-md">
        <div className="w-12 h-12 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center mx-auto text-[#C9A227]">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="font-serif font-bold text-lg text-white">Métricas da Sua Empresa no Guia</h3>
          <p className="text-xs text-stone-300">
            Ainda não há dados suficientes para gerar estatísticas comerciais nos últimos {days} dias. Divulgue seu anúncio no Guia da Conexão Maçônica para acompanhar cliques no WhatsApp, visualizações e mapa de calor agregados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Analytics & Seletor de Períodos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-xl text-white">Inteligência Comercial & Desempenho</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30">
              Dados Agregados
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Acompanhe o engajamento de clientes e intenções de compra no Guia Comercial.
          </p>
        </div>

        {/* Seletor de Períodos (7, 30, 90 Dias) */}
        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-xl shrink-0">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                days === d
                  ? 'bg-[#C9A227] text-[#3B0B14] shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Visualizações */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Visualizações</span>
            <Users className="w-5 h-5 text-[#C9A227]" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-serif font-bold text-white">{summary.views.toLocaleString('pt-BR')}</p>
            {summary.views_growth_percent !== 0 && (
              <span
                className={`text-xs font-bold ${
                  summary.views_growth_percent > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {summary.views_growth_percent > 0 ? '+' : ''}
                {summary.views_growth_percent}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500">Pessoas que abriram seu anúncio nos últimos {days} dias</p>
        </div>

        {/* Card 2: Interações Comerciais */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Interações Comerciais</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-serif font-bold text-emerald-400">
              {summary.interactions.toLocaleString('pt-BR')}
            </p>
            {summary.interactions_growth_percent !== 0 && (
              <span
                className={`text-xs font-bold ${
                  summary.interactions_growth_percent > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {summary.interactions_growth_percent > 0 ? '+' : ''}
                {summary.interactions_growth_percent}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500">Ações de contato (WhatsApp, Telefone, Site, Rotas)</p>
        </div>

        {/* Card 3: Taxa de Interação */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Taxa de Interação</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-300">{summary.interaction_rate_percent}%</p>
          <p className="text-[11px] text-stone-500">Proporção de visitantes que iniciaram contato comercial</p>
        </div>
      </div>

      {/* Detalhamento das Ações Comerciais & Cidades Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalhamento das Interações */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" /> Detalhamento por Canal de Contato
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-200">Cliques no WhatsApp</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300">{summary.breakdown.whatsapp}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-200">Rotas / Como Chegar</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-200">{summary.breakdown.directions}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-stone-200">Acessos ao Website</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-300">{summary.breakdown.website}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-stone-200">Chamadas Telefônicas</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-300">{summary.breakdown.phone}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800/80">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-stone-200">Clube de Benefícios & Serviços</span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-300">
                {summary.breakdown.benefits + summary.breakdown.services}
              </span>
            </div>
          </div>
        </div>

        {/* Mapa de Calor Agregado & Cidades */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" /> Mapa de Calor & Cidades Principais (Agregado)
          </h3>

          <div className="space-y-3">
            {summary.aggregated_heatmap.length > 0 ? (
              summary.aggregated_heatmap.slice(0, 5).map((item) => {
                const maxIntensity = Math.max(...summary.aggregated_heatmap.map((h) => h.intensity), 1);
                const percent = Math.round((item.intensity / maxIntensity) * 100);

                return (
                  <div key={item.geo_bucket} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-stone-300">
                      <span>
                        {item.city} ({item.state})
                      </span>
                      <span className="text-[#C9A227] font-mono">{item.intensity} acessos</span>
                    </div>
                    <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-[#C9A227] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-stone-500 italic py-4">Nenhum dado geográfico no período selecionado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
