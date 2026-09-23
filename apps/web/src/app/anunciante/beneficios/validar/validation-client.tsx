'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2, Search, TicketCheck } from 'lucide-react';
import { confirmRedemptionUseAction, lookupRedemptionByCodeAction, type BenefitLookupResult } from '@/lib/advertiser/benefit-validation-service';

export default function BenefitValidationClient() {
  const [code, setCode] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [redemption, setRedemption] = useState<BenefitLookupResult['redemption']>();
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string }>();
  const [loading, setLoading] = useState(false);

  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(undefined);
    const result = await lookupRedemptionByCodeAction(code);
    setRedemption(result.redemption);
    if (!result.success) setMessage({ type: 'error', text: result.error || 'Código não localizado.' });
    setLoading(false);
  };

  const confirm = async () => {
    setLoading(true);
    setMessage(undefined);
    const amount = saleAmount.trim() ? Number(saleAmount.replace(',', '.')) : undefined;
    const result = await confirmRedemptionUseAction(code, amount);
    if (result.success) {
      setMessage({ type: 'success', text: 'Utilização confirmada com sucesso.' });
      const refreshed = await lookupRedemptionByCodeAction(code);
      setRedemption(refreshed.redemption);
    } else {
      setMessage({ type: 'error', text: result.error || 'Não foi possível confirmar a utilização.' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[#3B0B14]"><TicketCheck className="h-6 w-6 text-[#C9A227]" />Validar benefício</h1>
        <p className="mt-1 text-sm text-stone-600">Consulte o código apresentado pelo cliente e, opcionalmente, confirme sua utilização.</p>
      </div>

      <form onSubmit={lookup} className="flex max-w-xl gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required placeholder="CM-483921" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-2 font-mono uppercase" />
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#4B161B] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Consultar
        </button>
      </form>

      {message && <div className={`max-w-xl rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

      {redemption && (
        <section className="max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-stone-500">Benefício</p><h2 className="font-serif text-lg font-bold text-stone-900">{String(redemption.benefit_snapshot?.title || 'Benefício')}</h2></div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase text-stone-700">{redemption.status}</span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-stone-500">Cliente</dt><dd className="font-bold">{redemption.user_display_name}</dd></div><div><dt className="text-stone-500">Resgatado em</dt><dd className="font-bold">{new Date(redemption.redeemed_at).toLocaleString('pt-BR')}</dd></div></dl>
          {redemption.status === 'redeemed' && (
            <div className="space-y-3 border-t border-stone-200 pt-4">
              <label className="block text-xs font-bold text-stone-600">Valor da venda (opcional)<input value={saleAmount} onChange={(event) => setSaleAmount(event.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></label>
              <button onClick={confirm} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Confirmar utilização</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
