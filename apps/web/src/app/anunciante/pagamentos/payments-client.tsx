'use client';

import React from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  AdvertiserPlanBillingDTO,
} from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserPaymentsClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const { plan, invoices } = data;

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Financeiro &amp; Histórico • Cobranças e Recibos
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Faturas &amp; Pagamentos
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Histórico completo de faturas, comprovantes de pagamento e cartão cadastrado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/anunciante/plano"
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-stone-600" />
            <span>Meu Plano</span>
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

      {/* CARTÃO DE MÉTODO DE PAGAMENTO CADASTRADO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#C9A227]" /> Método de Pagamento Principal
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-mono font-bold">
            Ativo
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <strong className="text-stone-900 block font-medium">{plan.payment_method_summary}</strong>
            <span className="text-stone-500 text-[11px]">Pagamento processado com criptografia via gateway seguro Asaas</span>
          </div>

          <span className="text-stone-600 font-mono text-[11px]">
            Renovação Anual: <strong>{plan.renews_at}</strong>
          </span>
        </div>
      </div>

      {/* HISTÓRICO DE FATURAS */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
          Histórico de Faturas &amp; Recibos
        </h2>

        {invoices.length === 0 ? (
          <p className="text-xs text-stone-500 py-4 text-center">
            Nenhuma fatura registrada no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900">{inv.invoice_number}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {inv.status_label}
                    </span>
                  </div>

                  <p className="text-stone-600">
                    Vencimento: <span className="font-mono">{inv.due_date}</span> {inv.paid_at && `• Pago em ${inv.paid_at}`}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <strong className="font-serif font-bold text-base text-stone-900">
                    {formatBRL(inv.amount_cents)}
                  </strong>

                  <button
                    type="button"
                    onClick={() => alert(`Download do recibo oficial ${inv.invoice_number}`)}
                    className="p-2 bg-white text-stone-700 hover:text-stone-900 border border-stone-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-stone-500" />
                    <span>Recibo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
