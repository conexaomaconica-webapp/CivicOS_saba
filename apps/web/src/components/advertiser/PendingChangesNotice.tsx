'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cancelChangeRequestAction, type ChangeRequestItem } from '@/lib/advertiser/change-requests-service';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Alterações da empresa que dependem da validação da plataforma: o que está em análise (com opção de cancelar)
 * e as decisões recentes, com o motivo quando foi recusada. A versão publicada no Guia não muda até a aprovação.
 */
export function PendingChangesNotice({ pending, recent }: { pending: ChangeRequestItem[]; recent: ChangeRequestItem[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState('');

  if (pending.length === 0 && recent.length === 0) return null;

  const cancel = (id: string) => {
    setError('');
    startTransition(async () => {
      const res = await cancelChangeRequestAction(id);
      if (!res.success) setError(res.message);
      router.refresh();
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs" aria-label="Alterações em análise">
      {pending.length > 0 && (
        <>
          <h2 className="flex items-center gap-2 font-serif text-sm font-bold text-amber-900">
            <Clock className="h-4 w-4" aria-hidden /> Em análise pela plataforma ({pending.length})
          </h2>
          <p className="text-amber-900/80">A versão atual continua publicada no Guia. Você será avisado quando a análise terminar.</p>
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
                {item.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt={`Prévia: ${item.entityLabel}`} className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900">{item.entityLabel}</p>
                  <p className="truncate text-stone-600">{item.summary} · enviado em {dateFmt.format(new Date(item.submittedAt))}</p>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(item.id)}
                  disabled={busy}
                  className="min-h-9 rounded-lg border border-stone-300 px-3 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancelar envio
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {recent.length > 0 && (
        <ul className="space-y-1.5 border-t border-amber-200 pt-3">
          {recent.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-stone-700">
              {item.status === 'approved' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              )}
              <span>
                <strong>{item.entityLabel}</strong> ({item.summary}):{' '}
                {item.status === 'approved' ? 'aprovada e publicada' : `não aprovada${item.reviewNote ? ` — ${item.reviewNote}` : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="font-semibold text-rose-700" role="alert">{error}</p>}
    </section>
  );
}
