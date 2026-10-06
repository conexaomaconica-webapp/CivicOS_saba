'use client';

import { Download } from 'lucide-react';

type Props = {
  /** Texto do contrato já sem o bloco HTML da assinatura. */
  text: string;
  businessName: string;
  legalName: string;
  /** Assinatura desenhada (data URL), quando o contrato já foi assinado. */
  signatureImage?: string | null;
  signerName?: string;
  signerCpf?: string;
  signedAtLabel?: string;
  sha256Hash: string;
  className?: string;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Abre o contrato em uma janela própria (papel timbrado, texto, assinatura e hash) pronta para imprimir ou salvar em PDF.
 * A assinatura entra como imagem de verdade (nunca como código no meio do texto).
 */
export function ContractPrintButton({
  text,
  businessName,
  legalName,
  signatureImage,
  signerName,
  signerCpf,
  signedAtLabel,
  sha256Hash,
  className,
}: Props) {
  const openPrintView = () => {
    const win = window.open('', '_blank');
    if (!win) {
      window.print();
      return;
    }
    const safeImage = signatureImage && signatureImage.startsWith('data:image/') ? signatureImage : '';
    const signature = safeImage
      ? `<div style="margin-top:28px;text-align:center;page-break-inside:avoid">
          <p style="font-family:Georgia,serif;font-weight:bold;color:#3B0B14;margin:0 0 8px">ASSINATURA ELETRÔNICA DO REPRESENTANTE LEGAL</p>
          <img src="${safeImage}" alt="Assinatura do representante legal" style="display:block;max-width:320px;max-height:130px;margin:0 auto 4px;object-fit:contain" />
          <div style="width:360px;max-width:100%;margin:0 auto;border-top:1px solid #333;padding-top:6px;font-size:11px;font-weight:bold">
            <div>CONTRATANTE / RAZÃO SOCIAL: ${escapeHtml(legalName || businessName)}</div>
            ${signerName ? `<div>REPRESENTANTE LEGAL: ${escapeHtml(signerName)}</div>` : ''}
            ${signerCpf ? `<div>CPF: ${escapeHtml(signerCpf)}</div>` : ''}
            ${signedAtLabel ? `<div style="font-weight:normal">Registrada em ${escapeHtml(signedAtLabel)}</div>` : ''}
          </div>
        </div>`
      : '';
    win.document.write(`<!DOCTYPE html><html><head><title>Contrato - ${escapeHtml(businessName)}</title><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.5; color: #111; padding: 20px; background: #fff; }
  .content { white-space: pre-wrap; word-wrap: break-word; padding: 20px 0; }
  .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #666; text-align: center; word-break: break-all; }
</style></head><body>
  <div style="background:#3B0B14;padding:18px 24px;border-bottom:3px solid #C9A227;text-align:center">
    <div style="color:#C9A227;font-size:20pt;font-family:Georgia,serif;letter-spacing:2px">CONEXÃO MAÇÔNICA</div>
    <div style="color:#fff;font-size:9pt;margin-top:4px;text-transform:uppercase;letter-spacing:2px">GUIA DE EMPRESAS E SERVIÇOS MAÇÔNICOS</div>
  </div>
  <div style="background:#f4efe8;border-bottom:2px solid #3B0B14;padding:12px;margin-top:10px;font-family:Georgia,serif;font-weight:bold;font-size:11pt;color:#3B0B14;text-align:center;text-transform:uppercase">
    CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PUBLICIDADE E PRESENÇA COMERCIAL DIGITAL
  </div>
  <div class="content">${escapeHtml(text)}</div>
  ${signature}
  <div class="footer">Documento gerado via Plataforma Conexão Maçônica — Hash SHA-256: ${escapeHtml(sha256Hash)}</div>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <button
      type="button"
      onClick={openPrintView}
      className={
        className ||
        'inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 text-xs font-bold text-stone-800 hover:bg-stone-100'
      }
    >
      <Download className="h-4 w-4" aria-hidden /> Baixar / imprimir contrato
    </button>
  );
}
