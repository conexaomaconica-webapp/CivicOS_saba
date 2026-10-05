'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
  getCommercialInvoiceStateAction,
  updateCommercialInvoiceAction,
  type CommercialInvoiceState,
} from '@/lib/admin/admin-commercial-invoice-service';

/** Controle opcional de nota fiscal: segura o pagamento do cliente até a nota ser registrada como emitida. */
export default function InvoiceControl({ businessId }: { businessId: string }) {
  const [state, setState] = useState<CommercialInvoiceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void getCommercialInvoiceStateAction(businessId).then((res) => {
      if (res.success && res.state) setState(res.state);
      else setError(res.error || null);
    });
  }, [businessId]);

  const save = (required: boolean, issued: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await updateCommercialInvoiceAction({ businessId, required, issued, number });
      if (res.success && res.state) setState(res.state);
      else setError(res.error || 'Não foi possível salvar.');
    });
  };

  if (!state && !error) return null;

  return (
    <section className="mt-6 rounded-2xl border border-stone-300 bg-white p-5 space-y-3">
      <div>
        <h3 className="font-serif text-lg font-bold text-stone-900">Nota fiscal (opcional)</h3>
        <p className="text-xs text-stone-600">
          Só marque se o cliente pediu nota fiscal. Enquanto ela não for registrada como emitida, o pagamento fica em espera
          na tela do cliente. Sem marcar, o pagamento é liberado logo após a assinatura.
        </p>
      </div>

      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

      {state && (
        <>
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <input
              type="checkbox"
              checked={state.required}
              disabled={pending}
              onChange={(e) => save(e.target.checked, false)}
            />
            Cliente solicitou nota fiscal
          </label>

          {state.required && !state.issued_at && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Número da nota (opcional)"
                maxLength={60}
                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true, true)}
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Marcar nota emitida e liberar pagamento
              </button>
              <span className="text-xs font-semibold text-amber-700">Pagamento em espera</span>
            </div>
          )}

          {state.required && state.issued_at && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-emerald-700">
                Nota emitida{state.number ? ` nº ${state.number}` : ''} em {new Date(state.issued_at).toLocaleDateString('pt-BR')} — pagamento liberado.
              </span>
              <button type="button" disabled={pending} onClick={() => save(true, false)} className="text-xs text-stone-600 underline">
                Desfazer
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
