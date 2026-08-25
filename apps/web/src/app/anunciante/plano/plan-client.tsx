'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
} from 'lucide-react';
import {
  AdvertiserPlanBillingDTO,
  requestPlanUpgradeAction,
} from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserPlanClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const { plan, quotas, upgradeRecommendation } = data;
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUpgradeRequest = async (targetCode: string) => {
    setRequestingUpgrade(true);
    setFeedback(null);
    const res = await requestPlanUpgradeAction(targetCode);
    setRequestingUpgrade(false);
    if (res.success) {
      setFeedback(res.message);
    }
  };

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Gestão do Produto Commercial • Plano &amp; Assinatura
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Meu Plano &amp; Benefícios Contratados
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Confira as cotas liberadas, vigência e recursos inclusos no seu pacote atual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/anunciante/pagamentos"
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-stone-600" />
            <span>Faturas &amp; Pagamentos</span>
          </Link>

          <Link
            href="/anunciante/contrato"
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-stone-600" />
            <span>Meu Contrato</span>
          </Link>
        </div>
      </div>

      {/* FEEDBACK DE UPGRADE */}
      {feedback && (
        <div className="p-4 rounded-2xl border text-xs flex items-center gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* SEÇÃO 1: CARD DO PLANO ATUAL */}
      <div className="p-6 bg-[#3B0B14] text-[#F9F6F0] rounded-3xl border border-[#C9A227]/40 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A227]/20 pb-4">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-[#C9A227]/20 text-[#C9A227] rounded-full text-[10px] font-mono font-bold uppercase border border-[#C9A227]/40 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" /> {plan.badge_label}
            </span>
            <h2 className="text-2xl font-serif font-bold text-white mt-1">
              {plan.name}
            </h2>
            <p className="text-xs text-stone-300">
              {plan.slogan}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-[11px] font-mono text-stone-400 block">Valor da Assinatura Anual</span>
            <strong className="text-2xl font-serif font-bold text-[#C9A227] block">
              {formatBRL(plan.amount_cents)} <span className="text-xs font-sans font-normal text-stone-300">/ ano</span>
            </strong>
            <span className="text-[11px] font-mono text-stone-300 block flex items-center sm:justify-end gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#C9A227]" /> Renovação em {plan.renews_at}
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-200 leading-relaxed">
          {plan.description}
        </p>

        <div className="pt-2 flex items-center justify-between text-xs text-stone-300 border-t border-[#C9A227]/20">
          <span>Forma de Pagamento: <strong>{plan.payment_method_summary}</strong></span>
        </div>
      </div>

      {/* SEÇÃO 2: COTAS EM TEMPO REAL */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
          <span>Consumo de Cotas do Plano ({plan.name})</span>
          <span className="text-xs font-mono font-normal text-stone-500">Uso Atual vs Limite</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* SERVIÇOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between font-bold text-stone-800">
              <span>Catálogo de Serviços</span>
              <span className="font-mono">{quotas.services_used} / {quotas.services_limit}</span>
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
            <div className="flex justify-between font-bold text-stone-800">
              <span>Ofertas Fraternas &amp; Descontos</span>
              <span className="font-mono">{quotas.benefits_used} / {quotas.benefits_limit}</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${(quotas.benefits_used / (quotas.benefits_limit || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* GALERIA */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between font-bold text-stone-800">
              <span>Fotos na Galeria do Anúncio</span>
              <span className="font-mono">{quotas.gallery_used} / {quotas.gallery_limit}</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full"
                style={{ width: `${(quotas.gallery_used / quotas.gallery_limit) * 100}%` }}
              />
            </div>
          </div>

          {/* POSTS E EVENTOS */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex justify-between font-bold text-stone-800">
              <span>Publicações &amp; Eventos</span>
              <span className="font-mono">{quotas.posts_used} / {quotas.posts_limit}</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full"
                style={{ width: `${(quotas.posts_used / quotas.posts_limit) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: CARD DE UPGRADE RECOMENDADO (SEM PRESSÃO AGRESSIVA) */}
      {upgradeRecommendation && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Oportunidade de Maior Destaque
              </span>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Conheça os diferenciais do {upgradeRecommendation.target_plan_name}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleUpgradeRequest(upgradeRecommendation.target_plan_code)}
              disabled={requestingUpgrade}
              className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              {requestingUpgrade && <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />}
              <span>Solicitar Upgrade</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
            {upgradeRecommendation.highlight_features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
