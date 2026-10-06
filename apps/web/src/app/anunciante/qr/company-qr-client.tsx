'use client';

import React, { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { downloadQRCodePNG, downloadQRCodeSVG, generateQRCodeDataURL } from '@/lib/events/qr-code';

export function CompanyQrClient({ name, slug }: { name: string; slug: string }) {
  const [url, setUrl] = useState('');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const target = `${window.location.origin}/guia/${slug}/qr`;
    setUrl(target);
    generateQRCodeDataURL(target, 600)
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [slug]);

  const filename = `qr-conexao-${slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]">
          <QrCode className="h-6 w-6 text-[#C9A227]" aria-hidden />
          QR Code da empresa
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Imprima e deixe no balcão de {name}. Quem ler o QR registra a visita ou a compra direto na Conexão e conhece seus benefícios. Cada leitura aparece nos seus resultados como origem &quot;QR da empresa&quot;.
        </p>
      </div>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`QR Code de ${name} na Conexão Maçônica`} className="h-64 w-64" />
        ) : (
          <div className="h-64 w-64 animate-pulse rounded-xl bg-stone-100" aria-hidden />
        )}

        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate font-mono text-stone-700">{url}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="shrink-0 font-bold text-[#3B0B14]"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!url}
            onClick={() => void downloadQRCodePNG(url, filename)}
            className="rounded-xl bg-[#3B0B14] px-4 py-2 text-xs font-bold text-[#C9A227] disabled:opacity-50"
          >
            Baixar PNG (impressão)
          </button>
          <button
            type="button"
            disabled={!url}
            onClick={() => void downloadQRCodeSVG(url, filename)}
            className="rounded-xl border border-[#3B0B14] px-4 py-2 text-xs font-bold text-[#3B0B14] disabled:opacity-50"
          >
            Baixar SVG (vetorial)
          </button>
        </div>
      </section>
    </div>
  );
}
