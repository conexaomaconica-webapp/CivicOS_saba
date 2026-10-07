'use client';

import React, { useState } from 'react';
import { createLeadCaptureAction } from '@/app/actions/lead-capture';

const INPUT =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-[#5d1523] focus:outline-none focus:ring-2 focus:ring-[#5d1523]/15';
const LABEL = 'mb-1 block text-xs font-bold text-stone-700';

type PlanOption = { value: 'bronze' | 'prata' | 'ouro'; label: string };

const DEFAULT_PLAN_OPTIONS: PlanOption[] = [
  { value: 'bronze', label: 'Plano Esquadro' },
  { value: 'prata', label: 'Plano Compasso' },
  { value: 'ouro', label: 'Plano Acácia' },
];

export function LandingLeadCapture({ planOptions = DEFAULT_PLAN_OPTIONS }: { planOptions?: PlanOption[] }) {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');
  const [lodgeName, setLodgeName] = useState('');
  const [interestedPlan, setInterestedPlan] = useState<PlanOption['value']>(planOptions[1]?.value ?? 'prata');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const res = await createLeadCaptureAction({ fullName, companyName, phone, cityState, lodgeName, interestedPlan });
    setLoading(false);
    if (res.success) {
      setStatus({ type: 'success', text: 'Recebemos seus dados! Nossa equipe entrará em contato em breve.' });
      setFullName('');
      setCompanyName('');
      setPhone('');
      setCityState('');
      setLodgeName('');
    } else {
      setStatus({ type: 'error', text: res.error || 'Não foi possível enviar. Tente novamente.' });
    }
  };

  return (
    <section id="captacao-lead" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6d12]">Fale com a gente</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2a0a10] sm:text-4xl">Prefere que entremos em contato?</h2>
          <p className="mt-3 text-stone-600">Deixe seus dados e nossa equipe ajuda você a anunciar.</p>
        </div>

        {status ? (
          <div
            role="status"
            className={`mt-6 rounded-lg p-4 text-center text-sm font-semibold ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}
          >
            {status.text}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-3xl bg-[#fbf7ee] p-6 ring-1 ring-stone-200 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Seu nome completo *</label>
              <input className={INPUT} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ex.: Carlos Silva" />
            </div>
            <div>
              <label className={LABEL}>Nome da empresa *</label>
              <input className={INPUT} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Ex.: Silva Advocacia" />
            </div>
            <div>
              <label className={LABEL}>WhatsApp / telefone *</label>
              <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="(75) 99999-8888" />
            </div>
            <div>
              <label className={LABEL}>Cidade / UF *</label>
              <input className={INPUT} value={cityState} onChange={(e) => setCityState(e.target.value)} required placeholder="Feira de Santana / BA" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Loja maçônica (opcional)</label>
            <input className={INPUT} value={lodgeName} onChange={(e) => setLodgeName(e.target.value)} placeholder="Ex.: Loja Fraternidade e Luz, 123" />
          </div>
          <div>
            <label className={LABEL}>Plano de interesse</label>
            <select className={INPUT} value={interestedPlan} onChange={(e) => setInterestedPlan(e.target.value as PlanOption['value'])}>
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#5d1523] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5d1523]/20 transition hover:bg-[#4B161B] disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </section>
  );
}
