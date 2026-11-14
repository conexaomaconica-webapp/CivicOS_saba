'use client';

import React, { useState } from 'react';

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly value={link} aria-label="Link de indicação" className="flex-1 min-w-[16rem] border border-stone-300 rounded-xl px-3 py-2 text-sm bg-stone-50 font-mono" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={copy} className="px-4 py-2 rounded-xl bg-[#3B0B14] text-white text-xs font-bold cursor-pointer">
        {copied ? 'Copiado ✓' : 'Copiar link'}
      </button>
    </div>
  );
}
