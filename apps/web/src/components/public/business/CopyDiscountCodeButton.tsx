'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyDiscountCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback silencioso caso clipboard API esteja desabilitada
      }
    })();
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-md transition-colors border border-amber-400/50"
      title="Copiar código promocional"
      data-testid="copy-discount-code-btn"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span className="text-emerald-800">Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-amber-800" />
          <span>Copiar Código</span>
        </>
      )}
    </button>
  );
}
