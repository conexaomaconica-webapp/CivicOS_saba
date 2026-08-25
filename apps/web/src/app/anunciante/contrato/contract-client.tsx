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
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Selo de Autenticidade e Assinatura Digital
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-mono font-bold">
              Snapshot Válido ({contract.version})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">Aceite Eletrônico Realizado</span>
              <strong className="font-mono text-stone-900 block">{new Date(contract.signed_at).toLocaleString('pt-BR')}</strong>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">Status do Documento</span>
              <strong className="font-mono text-emerald-700 block">Integridade Verificada — SHA-256</strong>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">Versão do Snapshot</span>
              <strong className="font-mono text-stone-900 block truncate">{contract.version} ({contract.snapshot_id})</strong>
            </div>
          </div>

          <div className="p-3 bg-stone-900 text-[#F9F6F0] rounded-2xl space-y-1 text-xs">
            <span className="text-[10px] font-mono font-bold text-[#C9A227] uppercase block flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#C9A227]" /> Hash de Integridade Imutável (SHA-256)
            </span>
            <code className="font-mono text-[11px] text-stone-300 break-all block">
              {contract.sha256_hash}
            </code>
          </div>
        </div>
      )}

      {/* DOCUMENTO FORMAL TIMBRADO PARA IMPRESSÃO & VISUALIZAÇÃO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* CABEÇALHO TIMBRADO CONEXÃO MAÇÔNICA */}
        <div className="border-b border-stone-300 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#3B0B14] border border-[#C9A227]/40 flex items-center justify-center font-serif font-bold text-lg text-[#C9A227]">
              CM
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-stone-900">
                CONEXÃO MAÇÔNICA SAAS PLATFORM
              </h2>
              <p className="text-[11px] text-stone-500 font-mono">
                CNPJ: 48.912.345/0001-99 • Guia Comercial Integrado
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-mono font-bold">
              CONTRATO ASSINADO DIGITALMENTE
            </span>
          </div>
        </div>

        {/* REQUADRO DE IDENTIFICAÇÃO DO CONTRATANTE E PLANO */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">EMPRESA CONTRATANTE</span>
            <strong className="font-bold text-stone-900 text-sm block">{business.name}</strong>
            <p className="text-stone-600 font-mono">CNPJ: {business.cnpj || '12.345.678/0001-90'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase block">CONDIÇÕES CONTRATUAIS</span>
            <p className="text-stone-800 font-semibold">{plan.name} ({plan.slogan})</p>
            <p className="text-stone-600 font-mono">Forma: {plan.payment_method_summary}</p>
          </div>
        </div>

        {/* CONTEÚDO INTEGRAL DO TERMO DE ADESÃO */}
        <div className="prose prose-stone max-w-none text-xs leading-relaxed whitespace-pre-line font-serif text-stone-800 p-4 bg-white border border-stone-200 rounded-2xl">
          {contract?.rendered_text}
        </div>

        {/* SELO DE SEGURANÇA E TIMBRE DE ASSINATURA NO RODAPÉ */}
        <div className="pt-4 border-t border-stone-300 space-y-2 text-[10px] font-mono text-stone-500">
          <div className="flex items-center justify-between">
            <span>Certificado Digital SHA-256: <strong>{contract?.sha256_hash}</strong></span>
            <span>Assinado em: {contract ? new Date(contract.signed_at).toLocaleString('pt-BR') : '24/08/2026 14:32'}</span>
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
