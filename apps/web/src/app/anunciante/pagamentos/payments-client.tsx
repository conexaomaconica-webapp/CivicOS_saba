'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
  Printer,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  AdvertiserPlanBillingDTO,
  AdvertiserInvoiceItem,
} from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserPaymentsClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const { plan, invoices, business } = data;
  const [selectedInvoice, setSelectedInvoice] = useState<AdvertiserInvoiceItem | null>(null);

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4 print:hidden">
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
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3 print:hidden">
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
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
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
                    onClick={() => setSelectedInvoice(inv)}
                    className="px-3 py-1.5 bg-white text-stone-800 hover:text-stone-900 border border-stone-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                  >
                    <Download className="w-4 h-4 text-stone-500" />
                    <span>Recibo Timbrado</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE RECIBO OFICIAL TIMBRADO */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl relative print:shadow-none print:p-0">
            {/* BARRA SUPERIOR DO MODAL */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 print:hidden">
              <span className="text-xs font-mono font-bold text-stone-500 uppercase">
                Visualização do Recibo Oficial
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-3.5 py-1.5 bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-[#C9A227]" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-stone-400 hover:text-stone-900 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENTO TIMBRADO OFICIAL */}
            <div className="space-y-6 text-stone-900 font-sans border border-stone-200 rounded-2xl p-6 print:border-none print:p-0">
              {/* TIMBRE CABEÇALHO */}
              <div className="flex items-center justify-between border-b border-stone-300 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#3B0B14] border border-[#C9A227]/40 flex items-center justify-center font-serif font-bold text-lg text-[#C9A227]">
                    CM
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      CONEXÃO MAÇÔNICA SAAS PLATFORM
                    </h3>
                    <p className="text-[11px] text-stone-500 font-mono">
                      CNPJ: 48.912.345/0001-99 • São Paulo / SP • contato@conexaomaconica.com.br
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-400 block">Comprovante Nº</span>
                  <strong className="font-mono text-base text-[#3B0B14]">
                    REC-{selectedInvoice.invoice_number.replace('FAT-', '')}
                  </strong>
                </div>
              </div>

              {/* TÍTULO E VALOR DO RECIBO */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">
                    VALOR TOTAL LIQUIDADO
                  </span>
                  <strong className="font-serif font-bold text-2xl text-emerald-800">
                    {formatBRL(selectedInvoice.amount_cents)}
                  </strong>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PAGO E LIQUIDADO
                </span>
              </div>

              {/* DADOS DO PAGADOR E DA TRANSAÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">DADOS DO ANUNCIANTE</span>
                  <strong className="font-bold text-stone-900 block">{business.name}</strong>
                  <p className="text-stone-600 font-mono">CNPJ: {business.cnpj || '12.345.678/0001-90'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">DETALHES DA LIQUIDAÇÃO</span>
                  <p className="text-stone-700">Fatura: <strong className="font-mono">{selectedInvoice.invoice_number}</strong></p>
                  <p className="text-stone-700">Data de Pagamento: <strong className="font-mono">{selectedInvoice.paid_at || selectedInvoice.due_date}</strong></p>
                  <p className="text-stone-700">Forma: <strong>{plan.payment_method_summary}</strong></p>
                </div>
              </div>

              {/* DECLARAÇÃO DE QUITAÇÃO */}
              <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-xl text-xs leading-relaxed text-stone-700 font-serif">
                Declaramos para os devidos fins que a quantia de <strong>{formatBRL(selectedInvoice.amount_cents)}</strong> foi devidamente recebida e quitada em referência ao licenciamento da presença comercial anual no Guia Maçônico no âmbito do <strong>{plan.name}</strong>.
              </div>

              {/* RODA PÉ E ASSINATURA DIGITAL */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>Conexão Maçônica • Emissão Automatizada Via Asaas Gateway</span>
                <span>Autenticação Digital ID: {selectedInvoice.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
