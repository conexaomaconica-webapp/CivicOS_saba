'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getSession, updatePassword, signOut } from '@/lib/auth/auth-service';
import { validatePassword, validateConfirmPassword, hasErrors } from '@/lib/auth/validation';

// Fundo do cartão é bordô escuro: textos claros e campos escuros com borda dourada (contraste AA).
const INPUT_CLASS =
  'w-full rounded-xl border border-[#C9A227]/40 bg-[#1f0509]/70 py-3 pl-3 pr-11 text-sm text-white placeholder:text-stone-400 focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40';

function PasswordField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-xs font-semibold text-stone-100">{props.label}</label>
      <div className="relative">
        <input
          id={props.id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={props.autoComplete}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-amber-200/90 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A227]/60"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {props.error && <span className="text-xs font-medium text-red-200">{props.error}</span>}
    </div>
  );
}

export default function UpdatePasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { user } = await getSession(supabase);
      setAuthenticated(Boolean(user));
      setCheckingSession(false);
    };
    void check();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(password, confirmPassword);
    setPasswordError(nextPasswordError ?? undefined);
    setConfirmError(nextConfirmError ?? undefined);

    if (hasErrors({
      password: nextPasswordError ?? undefined,
      confirmPassword: nextConfirmError ?? undefined,
    })) {
      setLoading(false);
      return;
    }

    try {
      const result = await updatePassword(supabase, password);
      if (result.error) {
        setErrorMsg('Não foi possível alterar a senha. O link pode ter expirado: peça um novo link de recuperação.');
        return;
      }
      await signOut(supabase);
      setDone(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar sua senha.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center py-8">
        <p className="text-sm text-stone-200">Verificando sessão…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status" className="flex w-full flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Senha alterada com sucesso!</h2>
        <p className="text-sm text-stone-200">Sua nova senha já está valendo. Entre na sua conta com ela.</p>
        <Link
          href="/login"
          className="mt-1 flex w-full items-center justify-center rounded-xl bg-[#C9A227] px-4 py-3 text-sm font-bold text-[#2b060d] shadow-sm transition-colors hover:bg-[#d8b13a]"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white">Definir nova senha</h2>
        <p className="text-sm text-stone-200">Escolha uma nova senha forte para sua conta.</p>
      </div>

      {!authenticated && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-400/10 p-3 text-sm text-amber-50">
          Você não possui uma sessão ativa de recuperação. Use o link enviado por e-mail para acessar esta página.{' '}
          <Link href="/forgot-password" className="font-semibold text-amber-300 underline hover:text-amber-200">
            Solicitar novo link
          </Link>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-red-400/60 bg-red-500/15 p-3 text-sm font-medium text-red-100">
          {errorMsg}
        </div>
      )}

      <PasswordField
        id="password"
        label="Nova senha"
        value={password}
        onChange={setPassword}
        placeholder="Mínimo 8 caracteres"
        error={passwordError}
        autoComplete="new-password"
      />
      <PasswordField
        id="confirm-password"
        label="Confirmar nova senha"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Repita a nova senha"
        error={confirmError}
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={loading || !authenticated}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-4 py-3 text-sm font-bold text-[#2b060d] shadow-sm transition-colors hover:bg-[#d8b13a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Salvando…</>) : 'Salvar nova senha'}
      </button>

      <div className="mt-1 flex justify-center text-xs text-stone-200">
        <Link href="/login" className="font-semibold text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
