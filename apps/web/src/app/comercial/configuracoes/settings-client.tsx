'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCommercialSettingsAction, type CommercialSettingsView } from '@/lib/commercial/settings-service';

export default function SettingsClient({ settings, loadError }: { settings: CommercialSettingsView | null; loadError: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    module_enabled: settings?.module_enabled ?? false,
    link_auto_attribution_enabled: settings?.link_auto_attribution_enabled ?? false,
    referral_validity_days: String(settings?.referral_validity_days ?? 30),
    lead_reservation_days: String(settings?.lead_reservation_days ?? 60),
    reason: '',
  });

  if (!settings) {
    return <p className="text-sm text-rose-700">{loadError ?? 'Configuração indisponível.'}</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await updateCommercialSettingsAction({
      module_enabled: form.module_enabled,
      link_auto_attribution_enabled: form.link_auto_attribution_enabled,
      referral_validity_days: Number(form.referral_validity_days),
      lead_reservation_days: Number(form.lead_reservation_days),
      reason: form.reason,
    });
    setMessage(res.success ? { type: 'success', text: 'Configuração salva e registrada na auditoria.' } : { type: 'error', text: res.error });
    if (res.success) {
      setForm((f) => ({ ...f, reason: '' }));
      router.refresh();
    }
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';
  const captureReady = settings.capture_mode !== 'off' && !!settings.capture_starts_at;

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border text-xs p-3 ${settings.envEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        Chave de aplicação <strong>FEATURE_COMMERCIAL_MODULE_ENABLED</strong>: {settings.envEnabled ? 'ligada' : 'desligada'} (definida na Vercel; não pode ser alterada aqui).
        {!settings.exists && ' Ainda não há configuração salva para este ambiente: valem os padrões (tudo desligado).'}
      </div>

      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-5">
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Configuração do módulo</h2>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={form.module_enabled} onChange={(e) => setForm((f) => ({ ...f, module_enabled: e.target.checked, link_auto_attribution_enabled: e.target.checked ? f.link_auto_attribution_enabled : false }))} />
          <span>
            <strong>Módulo comercial habilitado</strong> (<code>module_enabled</code>)
            <span className="block text-xs text-stone-500">Libera representantes, indicações e atribuições neste ambiente. Exige a captura financeira configurada.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={form.link_auto_attribution_enabled} disabled={!form.module_enabled} onChange={(e) => setForm((f) => ({ ...f, link_auto_attribution_enabled: e.target.checked }))} />
          <span>
            <strong>Atribuição automática pelo link</strong> (<code>link_auto_attribution_enabled</code>)
            <span className="block text-xs text-stone-500">Ao cadastrar uma empresa, cria atribuição <em>pendente</em> a partir do link /r/ do representante. Nunca confirma sozinha.</span>
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
          <label>Validade da indicação (dias, 1–365)
            <input type="number" min={1} max={365} className={input} value={form.referral_validity_days} onChange={(e) => setForm((f) => ({ ...f, referral_validity_days: e.target.value }))} required />
          </label>
          <label>Reserva de lead qualificado (dias, 1–365)
            <input type="number" min={1} max={365} className={input} value={form.lead_reservation_days} onChange={(e) => setForm((f) => ({ ...f, lead_reservation_days: e.target.value }))} required />
          </label>
        </div>

        <label className="block text-xs font-bold text-stone-700">Justificativa da alteração (obrigatória, mín. 10 caracteres)
          <input className={input} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required minLength={10} />
        </label>

        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
          {busy ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </form>

      <section className="rounded-2xl border border-[#E8E5DF] bg-white p-6 text-sm space-y-1">
        <h2 className="text-base font-serif font-bold text-[#3B0B14]">Captura financeira (somente leitura)</h2>
        <p>Modo: <strong>{settings.capture_mode}</strong> · Início: <strong>{settings.capture_starts_at ? new Date(settings.capture_starts_at).toLocaleDateString('pt-BR') : 'não definido'}</strong></p>
        <p className="text-xs text-stone-500">
          {captureReady
            ? 'A captura está configurada, então o módulo pode ser habilitado.'
            : 'A captura está desligada: o banco não permite habilitar o módulo até que ela seja configurada. Isso pertence ao Gate 1D e não é alterado nesta tela.'}
        </p>
      </section>
    </div>
  );
}
