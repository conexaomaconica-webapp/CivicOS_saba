'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Eye,
  Edit,
  TrendingUp,
  Award,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  MapPin,
  Sparkles,
  Camera,
  Briefcase,
  Gift,
  Calendar,
} from 'lucide-react';
import { AdvertiserDashboardDTO } from '@/lib/advertiser/advertiser-portal-service';

export default function AdvertiserHomeClient({ data }: { data: AdvertiserDashboardDTO }) {
  const { business, results30d, quotas, attention_alerts } = data;

  return (
    <div className="space-y-6 text-left">
      {/* BLOCO 1: HEADER EXECUTIVO COMERCIAL */}
      <div className="bg-[#1A1612] text-stone-100 border border-[#C9A227]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A227]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {business.publication_status_label}
              </span>

              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {business.payment_status_label}
              </span>

              <span className="bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                {business.plan_name}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#F9F6F0] tracking-wide">
              {business.name}
            </h1>

            <p className="text-xs text-stone-400 font-mono">
              Vigência da Assinatura: <strong className="text-amber-300">{business.expiration_date}</strong> (Renovação Automática Asaas)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/guia/${business.slug}`}
              target="_blank"
              className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4 text-[#C9A227]" />
              <span>Ver meu anúncio</span>
            </Link>

            <Link
              href="/anunciante/empresa"
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-2xl border border-stone-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit className="w-4 h-4 text-stone-400" />
              <span>Editar minha empresa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* BLOCO 2: BARRA DE COMPLETUDE REAL DO ANÚNCIO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <span className="text-[11px] font-mono font-bold text-amber-800 uppercase tracking-wider block">
              Qualidade da Presença no Guia
            </span>
            <h2 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
              Seu Anúncio está {business.completeness_percent}% Completo
            </h2>
          </div>

          <Link
            href="/anunciante/empresa"
            className="px-4 py-2 bg-[#3B0B14] hover:bg-[#520f1c] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Completar meu anúncio</span>
            <ArrowRight className="w-4 h-4 text-[#C9A227]" />
          </Link>
        </div>

        {/* BARRA VISUAL PROGRESSIVA */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-[#C9A227] to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${business.completeness_percent}%` }}
            />
          </div>
          <p className="text-[11px] text-stone-500 font-mono text-right">
            {business.completeness_percent} de 100 pontos de otimização
          </p>
        </div>

        {/* PENDÊNCIAS OBJETIVAS PARA COMPLETAR */}
        {business.missing_fields.length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2 text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" /> Recomendações para obter 100% de visibilidade:
            </span>
            <ul className="space-y-1 pl-5 list-disc text-amber-800 font-medium">
              {business.missing_fields.map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* BLOCO 3: RESULTADOS DOS ÚLTIMOS 30 DIAS (RESULTADOS & VALOR PERCEBIDO) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
              Retorno Comercial do Anúncio
            </span>
            <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2 mt-0.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Resultados — Últimos 30 Dias
            </h2>
          </div>

          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
            +{results30d.growth_percent}% em relação ao mês anterior
          </span>
        </div>

        {/* METRICAS DE INTERAÇÃO COMERCIAL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-1">
            <span className="text-stone-500 text-xs font-medium block">Visualizações</span>
            <strong className="text-2xl font-serif font-bold text-stone-900 block">
              {results30d.views.toLocaleString('pt-BR')}
            </strong>
            <span className="text-[10px] text-stone-400 font-mono">Páginas de anúncio exibidas</span>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-1">
            <span className="text-stone-500 text-xs font-medium block">Interações Totais</span>
            <strong className="text-2xl font-serif font-bold text-stone-900 block">
              {results30d.interactions.toLocaleString('pt-BR')}
            </strong>
            <span className="text-[10px] text-stone-400 font-mono">Ações de contato de clientes</span>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-1">
            <span className="text-emerald-800 text-xs font-medium flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Direct
            </span>
            <strong className="text-2xl font-serif font-bold text-emerald-700 block">
              {results30d.whatsapp_clicks}
            </strong>
            <span className="text-[10px] text-emerald-600 font-mono">Conversas iniciadas</span>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-1">
            <span className="text-stone-500 text-xs font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> Rotas GPS
            </span>
            <strong className="text-2xl font-serif font-bold text-stone-900 block">
              {results30d.route_clicks}
            </strong>
            <span className="text-[10px] text-stone-400 font-mono">Solicitações de localização</span>
          </div>
        </div>

        {/* CARD DE VALOR PERCEBIDO DESTACADO */}
        <div className="p-4 bg-[#3B0B14] text-[#F9F6F0] rounded-2xl border border-[#C9A227]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-[#C9A227]" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-semibold leading-snug">
              &quot;{results30d.whatsapp_clicks} pessoas demonstraram interesse direto na sua empresa e abriram seu WhatsApp nos últimos 30 dias.&quot;
            </p>
            <span className="text-[11px] text-stone-300 font-mono mt-0.5 block">
              Rede de Irmãos e Clientes Qualificados • Conexão Maçônica
            </span>
          </div>
        </div>
      </div>

      {/* BLOCO 4: CONSUMO DE COTAS DO PLANO (BARRAS DE CONSUMO) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
              Capacidade do Plano Ouro
            </span>
            <h2 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
              Uso de Cotas &amp; Recursos Liberados
            </h2>
          </div>

          <Link
            href="/anunciante/plano"
            className="text-xs font-bold text-[#3B0B14] hover:text-[#C9A227] transition-colors flex items-center gap-1"
          >
            <span>Ver detalhes do plano</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* FOTOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center font-semibold text-stone-800">
              <span>Fotos na Galeria</span>
              <strong className="font-mono text-stone-900">
                {quotas.photos_used} / {quotas.photos_limit}
              </strong>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full"
                style={{ width: `${(quotas.photos_used / quotas.photos_limit) * 100}%` }}
              />
            </div>
          </div>

          {/* SERVIÇOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center font-semibold text-stone-800">
              <span>Serviços Cadastrados</span>
              <strong className="font-mono text-stone-900">
                {quotas.services_used} / {quotas.services_limit}
              </strong>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A227] rounded-full"
                style={{ width: `${(quotas.services_used / quotas.services_limit) * 100}%` }}
              />
            </div>
          </div>

          {/* BENEFÍCIOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center font-semibold text-stone-800">
              <span>Benefícios &amp; Ofertas Fraternas</span>
              <strong className="font-mono text-stone-900">
                {quotas.benefits_used} / {quotas.benefits_limit}
              </strong>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${(quotas.benefits_used / quotas.benefits_limit) * 100}%` }}
              />
            </div>
          </div>

          {/* EVENTOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center font-semibold text-stone-800">
              <span>Eventos da Empresa</span>
              <strong className="font-mono text-stone-900">
                {quotas.events_used} / {quotas.events_limit}
              </strong>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-700 rounded-full"
                style={{ width: `${(quotas.events_used / quotas.events_limit) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 5: PRECISA DA SUA ATENÇÃO (ALERTAS PRIORITÁRIOS) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" /> Precisa da Sua Atenção
          </h2>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
            Recomendações
          </span>
        </div>

        <div className="space-y-3">
          {attention_alerts.map((alt) => (
            <div
              key={alt.id}
              className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <strong className="font-bold text-stone-900 block">{alt.title}</strong>
                <p className="text-stone-600">{alt.description}</p>
              </div>

              {alt.action_label && alt.action_url && (
                <Link
                  href={alt.action_url}
                  className="px-3.5 py-2 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] font-bold rounded-xl border border-[#C9A227]/30 text-xs shrink-0 self-start sm:self-auto transition-colors"
                >
                  {alt.action_label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BLOCO 6: ATALHOS RÁPIDOS DA OPERAÇÃO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
          Atalhos Rápidos
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/anunciante/empresa/midias"
            className="p-4 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-300 rounded-2xl text-center space-y-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-stone-900 block group-hover:text-amber-900">
              Adicionar fotos
            </span>
          </Link>

          <Link
            href="/anunciante/conteudo/servicos"
            className="p-4 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-300 rounded-2xl text-center space-y-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-stone-900 block group-hover:text-amber-900">
              Cadastrar serviço
            </span>
          </Link>

          <Link
            href="/anunciante/conteudo/beneficios"
            className="p-4 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-300 rounded-2xl text-center space-y-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-stone-900 block group-hover:text-amber-900">
              Criar benefício
            </span>
          </Link>

          <Link
            href="/anunciante/conteudo/eventos"
            className="p-4 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-amber-300 rounded-2xl text-center space-y-2 group transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-stone-900 block group-hover:text-amber-900">
              Criar evento
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
