'use client';

import React from 'react';
import {
  ShieldCheck,
  Printer,
  Lock,
} from 'lucide-react';
import { AdvertiserPlanBillingDTO } from '@/lib/advertiser/advertiser-billing-service';

export default function AdvertiserContractClient({ data }: { data: AdvertiserPlanBillingDTO }) {
  const { contract, business } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER DA TELA */}
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
            <span>Imprimir Contrato</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE EVIDÊNCIA CRIPTOGRÁFICA & AUTENTICIDADE */}
      {contract && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
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

          {/* HASH SHA-256 CRIPTOGRÁFICO */}
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

      {/* TEXTO COMPLETO DO CONTRATO RENDERIZADO */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-4 print:border-none print:shadow-none">
        <div className="border-b border-stone-200 pb-4 text-center space-y-1">
          <h2 className="font-serif font-bold text-xl text-stone-900">
            CONTRATO DE LICENCIAMENTO E ADESÃO AO GUIA COMERCIAL
          </h2>
          <p className="text-xs text-stone-500 font-mono">
            Plataforma SaaS Conexão Maçônica • Empresa: {business.name} ({business.cnpj})
          </p>
        </div>

        <div className="prose prose-stone max-w-none text-xs leading-relaxed whitespace-pre-line font-serif text-stone-800 p-4 bg-stone-50/50 border border-stone-100 rounded-2xl">
          {contract?.rendered_text}
        </div>

        <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400 font-mono">
          <span>Conexão Maçônica • Documento Assinado Digitalmente</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
