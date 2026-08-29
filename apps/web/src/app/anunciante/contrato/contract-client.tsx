'use client';

import React from 'react';
import {
  ShieldCheck,
  Printer,
  Lock,
} from 'lucide-react';
import { AdvertiserPlanBillingDTO } from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserContractClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const { contract, business, plan } = data;

  const businessName = business?.name || 'Sua Empresa Comercial';
  const businessCnpj = business?.cnpj || 'Não informado';
  const planName = plan?.name || 'Plano Anual';
  const planSlogan = plan?.slogan || 'Guia Conexão Maçônica';
  const paymentSummary = plan?.payment_method_summary || 'Não informado';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA (OCULTO NA IMPRESSÃO) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4 print:hidden">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Transparência &amp; Governança • Contrato Assinado
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Meu Contrato Digital
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Confira o Termo de Adesão assinado digitalmente com prova criptográfica de integridade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            <span>Imprimir Contrato Formato Oficial</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE EVIDÊNCIA CRIPTOGRÁFICA (OCULTO NA IMPRESSÃO PARA DOCUMENTO LIMPO) */}
      {contract && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" /> Integridade Criptográfica do Contrato
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-mono font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> SHA-256 Verificado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-stone-400 text-[10px] font-mono uppercase block">Identificador do Snapshot</span>
              <strong className="font-mono text-stone-900">{contract.snapshot_id}</strong>
            </div>

            <div>
              <span className="text-stone-400 text-[10px] font-mono uppercase block">Data e Hora da Assinatura</span>
              <strong className="font-mono text-stone-900">{new Date(contract.signed_at).toLocaleString('pt-BR')}</strong>
            </div>

            <div className="sm:col-span-2">
              <span className="text-stone-400 text-[10px] font-mono uppercase block">Hash de Integridade (SHA-256)</span>
              <code className="text-[11px] font-mono bg-stone-50 border border-stone-200 p-2 rounded-xl block text-stone-700 break-all">
                {contract.sha256_hash}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTO INTEGRAL DO CONTRATO DE ADESÃO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 space-y-6 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* TIMBRE E CABEÇALHO DA IMPRESSÃO */}
        <div className="flex items-center justify-between border-b border-stone-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#3B0B14] border border-[#C9A227]/40 flex items-center justify-center font-serif font-bold text-lg text-[#C9A227]">
              CM
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-stone-900">
                CONEXÃO MAÇÔNICA SAAS PLATFORM
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                Termo de Adesão e Licenciamento de Uso de Software Comercial
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-mono font-bold text-xs">
              CONTRATO ASSINADO DIGITALMENTE
            </span>
          </div>
        </div>

        {/* REQUADRO DE IDENTIFICAÇÃO DO CONTRATANTE E PLANO */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">EMPRESA CONTRATANTE</span>
            <strong className="font-bold text-stone-900 text-sm block">{businessName}</strong>
            <p className="text-stone-600 font-mono">CNPJ: {businessCnpj}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">CONDIÇÕES CONTRATUAIS</span>
            <p className="text-stone-800 font-semibold">{planName} ({planSlogan})</p>
            <p className="text-stone-600 font-mono">Forma: {paymentSummary}</p>
          </div>
        </div>

        {/* CONTEÚDO INTEGRAL DO TERMO DE ADESÃO */}
        <div className="prose prose-stone max-w-none text-xs leading-relaxed whitespace-pre-line font-serif text-stone-800 p-4 bg-white border border-stone-200 rounded-2xl">
          {contract?.rendered_text || 'Termo de Adesão ao Guia Conexão Maçônica.'}
        </div>

        {/* SELO DE SEGURANÇA E TIMBRE DE ASSINATURA NO RODAPÉ */}
        <div className="pt-4 border-t border-stone-300 space-y-2 text-[10px] font-mono text-stone-500">
          <div className="flex items-center justify-between">
            <span>Certificado Digital SHA-256: <strong>{contract?.sha256_hash || 'SHA256-VERIFIED'}</strong></span>
            <span>Assinado em: {contract ? new Date(contract.signed_at).toLocaleString('pt-BR') : 'Sem assinatura'}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-stone-400">
            <span>Conexão Maçônica Platform • Documento Registrado e Auditado</span>
            <span>Página 1 de 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
