'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, FileText, Lock, Printer, ShieldCheck } from 'lucide-react';
import type { AdvertiserContractDTO } from '@/lib/advertiser/advertiser-contract-service';
import { contractTextForPlainDisplay } from '@/lib/contracts/contract-template-renderer';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function AdvertiserContractClient({ data }: { data: AdvertiserContractDTO }) {
  const { business, contract } = data;
  const [copied, setCopied] = useState(false);

  if (!business || !contract) {
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
          <FileText className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-serif text-lg font-bold text-stone-900">Contrato ainda não disponível</h1>
        <p className="text-sm text-stone-500">
          {business
            ? 'Ainda não há contrato registrado para a sua empresa. Assim que a contratação for concluída com a nossa equipe, o termo assinado aparece aqui.'
            : 'Não encontramos uma empresa vinculada à sua conta.'}
        </p>
        <Link href="/anunciante/plano" className="inline-flex min-h-11 items-center rounded-xl bg-[var(--member-primary,#5d1523)] px-5 text-sm font-bold text-[var(--member-primary-fg,#fff)]">
          Ver meu plano
        </Link>
      </div>
    );
  }

  const text = contractTextForPlainDisplay(contract.rendered_text);
  const signedAt = contract.signed_at ? new Date(contract.signed_at) : null;
  const signedLabel = signedAt ? `${signedAt.toLocaleDateString('pt-BR')} às ${signedAt.toLocaleTimeString('pt-BR')}` : 'Ainda não assinado';

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: nada a fazer
    }
  };

  /** Abre uma janela só com o papel timbrado do contrato, pronta para imprimir ou salvar em PDF. */
  const printContract = () => {
    const win = window.open('', '_blank');
    if (!win) {
      window.print();
      return;
    }
    const signature = contract.signature_image_data
      ? `<div style="margin-top:28px;text-align:center;page-break-inside:avoid">
          <p style="font-family:Georgia,serif;font-weight:bold;color:#3B0B14">ASSINATURA ELETRÔNICA DO REPRESENTANTE LEGAL</p>
          <img src="${contract.signature_image_data}" alt="Assinatura do representante legal" style="display:block;max-width:320px;max-height:130px;margin:12px auto 4px;object-fit:contain" />
          <div style="width:360px;max-width:100%;margin:0 auto;border-top:1px solid #333;padding-top:6px;font-size:11px;font-weight:bold">
            CONTRATANTE: ${escapeHtml(business.legal_name || business.name)}
          </div>
        </div>`
      : '';
    win.document.write(`<!DOCTYPE html><html><head><title>Contrato - ${escapeHtml(business.name)}</title><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.5; color: #111; padding: 20px; background: #fff; }
  .content { white-space: pre-wrap; word-wrap: break-word; padding: 20px 0; font-size: 11px; }
  .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #666; text-align: center; }
</style></head><body>
  <div style="background:#3B0B14;padding:18px 24px;border-bottom:3px solid #C9A227;display:grid;grid-template-columns:80px 1fr 80px;align-items:center;">
    <img src="${window.location.origin}/logoconexao_red.png" alt="Conexão Maçônica" style="height:52px;object-fit:contain;" />
    <div style="text-align:center;"><div style="color:#C9A227;font-size:20pt;font-family:Georgia,serif;letter-spacing:2px;">CONEXÃO MAÇÔNICA</div>
    <div style="color:#fff;font-size:9pt;margin-top:4px;text-transform:uppercase;letter-spacing:2px;">GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS</div></div><div></div>
  </div>
  <div style="background:#f4efe8;border-bottom:2px solid #3B0B14;padding:12px;margin-top:10px;font-family:Georgia,serif;font-weight:bold;font-size:11pt;color:#3B0B14;text-align:center;text-transform:uppercase;">
    CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE E PRESENÇA COMERCIAL DIGITAL
  </div>
  <div class="content">${escapeHtml(text)}</div>
  ${signature}
  <div class="footer">Documento gerado via Plataforma Conexão Maçônica em ${new Date().toLocaleDateString('pt-BR')} — Hash SHA-256: ${escapeHtml(contract.sha256_hash)}</div>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#C9A227]">Transparência &amp; Governança • Contrato</span>
          <h1 className="mt-0.5 font-serif text-2xl font-bold text-stone-900">Meu Contrato Digital</h1>
          <p className="mt-0.5 text-xs text-stone-500">Instrumento formal homologado por aceite eletrônico, com prova criptográfica de integridade (SHA-256).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyText} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-100 px-3 text-xs font-bold text-stone-800 hover:bg-stone-200">
            <Copy className="h-4 w-4 text-stone-600" aria-hidden /> {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
          <button type="button" onClick={printContract} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#C9A227]/40 bg-[#3B0B14] px-4 text-xs font-bold text-[#C9A227] shadow-sm hover:bg-[#520f1c]">
            <Printer className="h-4 w-4" aria-hidden /> Salvar em PDF / Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
        <div className="space-y-1 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <span className="block font-bold text-stone-500">Status jurídico</span>
          <span className={`inline-block rounded-full px-3 py-1 font-bold ${contract.signed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
            {contract.signed ? '✓ Assinado e válido' : 'Assinatura pendente'}
          </span>
        </div>
        <div className="space-y-1 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <span className="block font-bold text-stone-500">Data e hora da assinatura</span>
          <strong className="block font-mono text-xs text-stone-900">{signedLabel}</strong>
        </div>
        <div className="space-y-1 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <span className="flex items-center gap-1 font-bold text-stone-500"><Lock className="h-3 w-3" aria-hidden /> Assinatura SHA-256</span>
          <strong className="block truncate font-mono text-[11px] text-stone-800" title={contract.sha256_hash}>{contract.sha256_hash}</strong>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-stone-700">
          <span>Papel timbrado oficial — cópia registrada</span>
          <span className="font-mono text-stone-400">Versão: {contract.version}</span>
        </div>

        <div className="relative space-y-6 overflow-hidden rounded-3xl border-2 border-[#3B0B14] bg-[#FAF8F5] p-5 shadow-md sm:p-8">
          <div className="pointer-events-none absolute inset-2 rounded-2xl border border-[#C9A227]/40" aria-hidden />

          <div className="-mx-5 -mt-5 grid grid-cols-[64px_1fr_64px] items-center rounded-t-3xl border-b-2 border-[#C9A227] bg-[#3B0B14] p-4 shadow-md sm:-mx-8 sm:-mt-8 sm:grid-cols-[80px_1fr_80px] sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoconexao_red.png" alt="Conexão Maçônica" className="h-12 object-contain sm:h-14" />
            <div className="space-y-0.5 text-center">
              <h2 className="font-serif text-base font-extrabold uppercase tracking-wider text-[#C9A227] sm:text-xl">CONEXÃO MAÇÔNICA</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-200 sm:text-[10px]">Guia de Empresas e Serviços Maçônicos</p>
            </div>
            <div />
          </div>

          <div className="my-3 rounded-xl border-y-2 border-[#3B0B14]/20 bg-[#3B0B14]/5 px-4 py-2.5 text-center">
            <h3 className="font-serif text-sm font-extrabold uppercase tracking-wide text-[#3B0B14] sm:text-base">
              Contrato de Prestação de Serviços de Publicidade e Presença Comercial Digital
            </h3>
          </div>

          <div className="max-h-[450px] select-text overflow-y-auto whitespace-pre-wrap pr-2 text-justify font-serif text-xs leading-relaxed text-stone-900">
            {text}
          </div>

          {contract.signature_image_data && (
            <div className="mx-auto w-full max-w-md space-y-2 border-t border-stone-300 pt-6 text-center">
              <p className="font-serif text-xs font-bold uppercase tracking-wider text-[#3B0B14]">Assinatura eletrônica do representante legal</p>
              <div className="flex min-h-28 items-center justify-center rounded-xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={contract.signature_image_data} alt={`Assinatura de ${contract.signer_name || business.name}`} className="max-h-28 max-w-full object-contain" />
              </div>
              <div className="border-t border-stone-700 pt-1.5 text-xs font-semibold text-stone-900">{contract.signer_name || business.name}</div>
              <p className="text-[10px] text-stone-500">Registrada em {signedAt ? signedAt.toLocaleString('pt-BR') : 'data não disponível'}</p>
            </div>
          )}

          <div className="space-y-1.5 rounded-xl border border-[#C9A227]/60 bg-white p-4 font-serif text-[11px] text-stone-800 shadow-xs">
            <div className="flex items-center gap-1.5 border-b border-stone-200 pb-1 text-xs font-bold uppercase tracking-wider text-[#3B0B14]">
              <ShieldCheck className="h-4 w-4 text-[#C9A227]" aria-hidden /> Dossiê de autenticidade e assinatura eletrônica (MP 2.200-2/2001)
            </div>
            <div>• <strong>Empresa signatária:</strong> {business.name}{business.legal_name ? ` (${business.legal_name})` : ''}</div>
            <div>• <strong>Documento CNPJ/CPF:</strong> {business.document || 'Registrado na plataforma'}</div>
            <div>• <strong>Status jurídico:</strong> {contract.signed ? 'CONTRATO ASSINADO E HOMOLOGADO' : 'AGUARDANDO ASSINATURA'}</div>
            <div>• <strong>Data/hora de aceite:</strong> {signedAt ? signedAt.toLocaleString('pt-BR') : 'Ainda não assinado'}</div>
            <div className="break-all">• <strong>Hash SHA-256:</strong> {contract.sha256_hash}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
