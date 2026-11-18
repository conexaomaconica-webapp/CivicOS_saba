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
      style={{ background: '#5d1523', color: '#fff', border: 0, borderRadius: 10, padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}
    >
      {busy ? 'Abrindo…' : 'Continuar e criar nova senha'}
    </button>
  );
}
