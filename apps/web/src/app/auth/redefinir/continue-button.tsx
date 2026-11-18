'use client';

import React from 'react';

/** O endereço de destino só existe quando o botão é clicado (não há <a href> com o token para leitores automáticos seguirem). */
export function ContinueRecoveryButton({ tokenHash }: { tokenHash: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        window.location.assign(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`);
      }}
      className="w-full rounded-xl bg-[#C9A227] px-4 py-3 text-sm font-bold text-[#2b060d] shadow-sm transition-colors hover:bg-[#d8b13a] disabled:cursor-default disabled:opacity-70"
    >
      {busy ? 'Abrindo…' : 'Continuar e criar nova senha'}
    </button>
  );
}
