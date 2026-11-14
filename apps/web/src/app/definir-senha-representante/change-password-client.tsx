'use client';

import React, { useState } from 'react';
import { changeTemporaryPasswordAction } from '@/lib/commercial/temp-password-service';

export default function ChangePasswordClient() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await changeTemporaryPasswordAction(form);
    if (res.success) {
      // Navegação completa: a sessão passa a refletir a conta sem a troca pendente.
      window.location.assign('/representante');
      return;
    }
    setError(res.error);
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm bg-white';

  return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#E8E5DF] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
        <div>
          <p className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Área do Representante</p>
          <h1 className="text-2xl font-serif font-bold text-[#3B0B14]">Defina sua senha</h1>
          <p className="text-sm text-stone-600 mt-2">
            Por segurança, troque a senha temporária que você recebeu antes de continuar. Use no mínimo 10 caracteres, com letras e números.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl text-sm font-semibold border bg-rose-50 text-rose-900 border-rose-200">
            {error}
          </div>
        )}

        <label className="block text-xs font-bold text-stone-700">Senha temporária
          <input type="password" autoComplete="current-password" className={input} value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
        </label>
        <label className="block text-xs font-bold text-stone-700">Nova senha
          <input type="password" autoComplete="new-password" className={input} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={10} />
        </label>
        <label className="block text-xs font-bold text-stone-700">Confirmar nova senha
          <input type="password" autoComplete="new-password" className={input} value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={10} />
        </label>

        <button type="submit" disabled={busy} className="w-full px-5 py-3 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  );
}
