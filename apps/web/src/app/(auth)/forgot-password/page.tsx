'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { requestPasswordRecoveryAction } from './actions';
import { validateEmail } from '@/lib/auth/validation';

// Fundo do cartão é bordô escuro: textos claros e campos escuros com borda dourada (contraste AA).
const INPUT_CLASS =
  'w-full rounded-xl border border-[#C9A227]/40 bg-[#1f0509]/70 px-3 py-3 text-sm text-white placeholder:text-stone-400 focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Link do e-mail que falhou (expirado, já usado ou inválido): /auth/confirm e /auth/callback voltam para cá com ?erro=link_invalido.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('erro') === 'link_invalido') {
      setErrorMsg('Este link de recuperação expirou, já foi usado ou é inválido. Informe seu e-mail abaixo para receber um novo.');
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError ?? undefined);
    if (nextEmailError) {
      setLoading(false);
      return;
    }

    try {
      // O servidor envia o e-mail da plataforma (identidade da marca); a resposta é a mesma exista a conta ou não.
      const result = await requestPasswordRecoveryAction(email.trim());
      if (result.success) {
        setSuccess(true);
      } else {
        setErrorMsg(result.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao enviar link de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { void handleResetPassword(e); }} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white">Recuperar senha</h2>
        <p className="text-sm text-stone-200">Informe seu e-mail e enviaremos as instruções para criar uma nova senha.</p>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-red-400/60 bg-red-500/15 p-3 text-sm font-medium text-red-100">
          {errorMsg}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-emerald-400/50 bg-emerald-500/15 p-3 text-sm font-medium text-emerald-100">
          Se o e-mail estiver cadastrado, enviamos o link para criar uma nova senha. Verifique sua caixa de entrada e a pasta de spam.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-stone-100">Endereço de e-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/80" aria-hidden="true" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(validateEmail(e.target.value) ?? undefined);
            }}
            placeholder="exemplo@email.com"
            className={`${INPUT_CLASS} pl-10`}
          />
        </div>
        {emailError && <span className="text-xs font-medium text-red-200">{emailError}</span>}
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-4 py-3 text-sm font-bold text-[#2b060d] shadow-sm transition-colors hover:bg-[#d8b13a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…</>) : 'Enviar link de recuperação'}
      </button>

      <div className="mt-1 flex justify-center text-xs text-stone-200">
        <Link href="/login" className="font-semibold text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
