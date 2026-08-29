'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  AdvertiserPlanBillingDTO,
  AdvertiserInvoiceItem,
} from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserPaymentsClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const router = useRouter();
  const { plan, invoices, business, is_empty, requires_selection, available_businesses } = data;
  const [selectedInvoice, setSelectedInvoice] = useState<AdvertiserInvoiceItem | null>(null);

  const formatBRL = (cents: number) =>
    ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handlePrintReceipt = () => {
    window.print();
  };

  // 1. Guardrail Multiempresa: Exige Seleção Explícita de Empresa
  if (requires_selection && available_businesses && available_businesses.length > 1) {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-8 max-w-xl mx-auto space-y-6 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-[#C9A227]">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-stone-900">Selecione a Empresa Anunciante</h2>
          <p className="text-xs text-stone-500">
            Você possui acesso a múltiplas empresas. Selecione a empresa desejada para visualizar o histórico financeiro factual.
          </p>
        </div>
        <div className="space-y-2 text-left">
          {available_businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => router.push(`/anunciante/pagamentos?businessId=${b.id}`)}
              className="w-full p-4 bg-stone-50 hover:bg-amber-50/50 border border-stone-200 hover:border-[#C9A227]/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer text-xs font-bold text-stone-900"
            >
              <span>{b.name}</span>
              <span className="text-[#C9A227]">Acessar faturas →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Guardrail Sem Empresa / DTO Vazia Segura
  if (is_empty || !business) {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-8 max-w-xl mx-auto space-y-4 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-stone-900">Nenhuma Empresa Vinculada</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Sua conta atual não possui nenhuma empresa ativa associada. Complete o cadastro de uma empresa no Portal do Anunciante para emitir assinaturas e faturas.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4 print:hidden">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Financeiro &amp; Histórico • Faturas Factuais
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Faturas &amp; Pagamentos ({business.name})
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Histórico completo de faturas, comprovantes de pagamento e vigência da assinatura.
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

      {/* CARTÃO DE MÉTODO DE PAGAMENTO CADASTRADO & RENOVAÇÃO */}
      {plan && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#C9A227]" /> {plan.name} — Status da Assinatura
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              plan.is_active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {plan.badge_label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <strong className="text-stone-900 block font-medium">Forma: {plan.payment_method_summary}</strong>
              <span className="text-stone-500 text-[11px]">Pagamento processado com criptografia via gateway seguro Asaas</span>
            </div>

            <span className="text-stone-600 font-mono text-[11px]">
              Renovação do Período: <strong>{plan.renews_at}</strong>
            </span>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE FATURAS FACTUAIS */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
        <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3">
          Histórico de Faturas &amp; Comprovantes
        </h2>

        {invoices.length === 0 ? (
          <div className="p-8 text-center space-y-2 border border-dashed border-stone-200 rounded-2xl">
            <FileText className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-700">Nenhuma fatura registrada no momento.</p>
            <p className="text-[11px] text-stone-500">As faturas geradas em suas contratações aparecerão listadas aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (inv.status === 'pending') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
              if (inv.status === 'overdue') badgeColor = 'bg-red-50 text-red-700 border-red-200';
              if (inv.status === 'canceled') badgeColor = 'bg-stone-100 text-stone-600 border-stone-300';
              if (inv.status === 'refunded') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
              if (inv.status === 'partially_refunded') badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';

              return (
                <div
                  key={inv.id}
                  className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900">{inv.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeColor}`}>
                        {inv.status_label}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">({inv.payment_method})</span>
                    </div>

                    <p className="text-stone-600">
                      Vencimento: <span className="font-mono">{inv.due_date}</span> {inv.paid_at && `• Liquidado em ${inv.paid_at}`}
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
                      <span>Detalhes / Comprovante</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE COMPROVANTE DE PAGAMENTO / DETALHES DA FATURA */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl relative print:shadow-none print:p-0">
            {/* BARRA SUPERIOR DO MODAL */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 print:hidden">
              <span className="text-xs font-mono font-bold text-stone-500 uppercase">
                Comprovante de Pagamento &amp; Detalhes da Fatura
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

            {/* DOCUMENTO DO COMPROVANTE */}
            <div className="space-y-6 text-stone-900 font-sans border border-stone-200 rounded-2xl p-6 print:border-none print:p-0">
              {/* CABEÇALHO */}
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
                      Comprovante Interno de Pagamento • Fatura {selectedInvoice.invoice_number}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-400 block">Comprovante Nº</span>
                  <strong className="font-mono text-base text-[#3B0B14]">
                    COMP-{selectedInvoice.invoice_number.replace('INV-', '')}
                  </strong>
                </div>
              </div>

              {/* VALOR E STATUS DA FATURA */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">
                    VALOR DA FATURA
                  </span>
                  <strong className="font-serif font-bold text-2xl text-stone-900">
                    {formatBRL(selectedInvoice.amount_cents)}
                  </strong>
                  {selectedInvoice.total_refunded_cents ? (
                    <span className="text-xs text-purple-700 font-mono block">
                      Estornado: {formatBRL(selectedInvoice.total_refunded_cents)}
                    </span>
                  ) : null}
                </div>

                <span className="px-3 py-1 bg-stone-100 text-stone-800 border border-stone-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> STATUS: {selectedInvoice.status_label.toUpperCase()}
                </span>
              </div>

              {/* DADOS DO ANUNCIANTE E TRANSAÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">DADOS DO ANUNCIANTE</span>
                  <strong className="font-bold text-stone-900 block">{business.name}</strong>
                  <p className="text-stone-600 font-mono">CNPJ: {business.cnpj || 'Não informado'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">DETALHES DA TRANSAÇÃO</span>
                  <p className="text-stone-700">Fatura: <strong className="font-mono">{selectedInvoice.invoice_number}</strong></p>
                  <p className="text-stone-700">Vencimento: <strong className="font-mono">{selectedInvoice.due_date}</strong></p>
                  <p className="text-stone-700">Forma: <strong>{selectedInvoice.payment_method}</strong></p>
                  {selectedInvoice.provider_transaction_id && (
                    <p className="text-stone-700">ID Gateway: <strong className="font-mono">{selectedInvoice.provider_transaction_id}</strong></p>
                  )}
                </div>
              </div>

              {/* RODA PÉ E AUTENTICAÇÃO DIGITAL */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>Conexão Maçônica • Sistema Canônico de Faturamento</span>
                <span>ID da Fatura: {selectedInvoice.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
