'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  AdvertiserPlanBillingDTO,
  requestPlanUpgradeAction,
} from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserPlanClient({
  data,
  limits,
}: {
  data: AdvertiserPlanBillingDTO;
  limits?: { photos: number; services: number; benefits: number; events: number; posts: number; videos: number } | null;
}) {
  const { plan, is_empty, business } = data;
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleUpgradeRequest = async (targetCode: string) => {
    setRequestingUpgrade(true);
    setFeedback(null);
    const res = await requestPlanUpgradeAction(targetCode);
    setRequestingUpgrade(false);
    setFeedback({ ok: res.success, text: res.message });
    if (res.success) router.refresh();
  };

  const formatBRL = (cents?: number) =>
    ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (is_empty || !plan || !business) {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-8 max-w-xl mx-auto space-y-4 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-stone-900">Nenhuma Empresa Vinculada</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Sua conta atual não possui nenhuma empresa ativa associada. Complete o cadastro no Portal do Anunciante para gerenciar seu plano.
        </p>
        <Link
          href="/anunciar/passo-2"
          className="inline-block px-5 py-2.5 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          Cadastrar Minha Empresa
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Gestão Comercial • Plano &amp; Assinatura
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Meu Plano ({business.name})
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Confira os recursos e vigência do seu plano contratado no Guia Conexão Maçônica.
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
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}
          role={feedback.ok ? 'status' : 'alert'}
        >
          {feedback.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* CARD DO PLANO ATUAL */}
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

      {/* O QUE O PLANO INCLUI (cadastro do plano em /admin/planos + cotas reais) */}
      <div className="p-6 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-sm">
        <h3 className="font-serif font-bold text-base text-stone-900">O que o seu plano inclui</h3>
        <ul className="grid grid-cols-1 gap-2 text-xs text-stone-700 sm:grid-cols-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {limits && (
          <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-xs sm:grid-cols-4">
            {[
              ['Fotos na galeria', limits.photos],
              ['Serviços', limits.services],
              ['Ofertas', limits.benefits],
              ['Eventos', limits.events],
              ['Publicações', limits.posts],
              ['Vídeo institucional', limits.videos],
            ]
              .filter(([, value]) => Number(value) > 0)
              .map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <span className="block text-stone-500">{label}</span>
                  <strong className="font-mono text-base text-stone-900">até {value}</strong>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* MUDANÇA DE PLANO */}
      {plan.next_plan && (
        <div className="p-6 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A227]" />
            <h3 className="font-serif font-bold text-base text-stone-900">Deseja expandir a visibilidade comercial?</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            O {plan.next_plan.name} libera mais recursos e cotas no Guia ({formatBRL(plan.next_plan.amount_cents)} por ano). O pedido vai para a nossa equipe comercial, que conclui a contratação com você.
          </p>
          {plan.pending_upgrade ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              Pedido para o {plan.pending_upgrade.target_name} em análise. Nossa equipe entrará em contato.
            </p>
          ) : (
            <button
              type="button"
              disabled={requestingUpgrade}
              onClick={() => handleUpgradeRequest(plan.next_plan!.code)}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#C9A227]/40 bg-[#3B0B14] px-4 py-2.5 text-xs font-bold text-[#C9A227] hover:bg-[#4B161B] disabled:opacity-60"
            >
              {requestingUpgrade ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Solicitar upgrade para o {plan.next_plan.name}</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
