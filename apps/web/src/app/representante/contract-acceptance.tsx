'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptRepresentativeContractAction } from '@/lib/commercial/contract-service';

export default function ContractAcceptance({ version, title, text }: { version: string; title: string; text: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    const res = await acceptRepresentativeContractAction({ version });
    if (res.success) {
      router.refresh();
      return;
    }
    setError(res.error);
    setBusy(false);
    if (/atualizado/i.test(res.error)) router.refresh();
  };

  return (
    <section aria-labelledby="contrato-titulo" className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
      <div>
        <h2 id="contrato-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">{title}</h2>
        <p className="text-xs text-stone-500">Versão {version}. Leia o contrato com atenção: é necessário aceitá-lo para usar a área do representante.</p>
      </div>

      <div tabIndex={0} aria-label="Texto do contrato" className="max-h-[50vh] overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl text-sm font-semibold border bg-rose-50 text-rose-900 border-rose-200">
          {error}
        </div>
      )}

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>Li e aceito os termos do contrato de representação (versão {version}).</span>
      </label>

      <button
        type="button"
        disabled={!agreed || busy}
        onClick={accept}
        className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer"
      >
        {busy ? 'Registrando…' : 'Aceitar contrato'}
      </button>
    </section>
  );
}
