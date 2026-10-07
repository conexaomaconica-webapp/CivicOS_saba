'use client';

import React, { useState, useTransition } from 'react';
import { sendSeoReminderAction } from '@/app/actions/admin-seo-reminder';

/** Envia ao anunciante o lembrete com as melhorias de perfil. Pede confirmação, porque sai e-mail para a pessoa. */
export default function RemindButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const send = () => {
    if (!window.confirm(`Enviar ao responsável por "${businessName}" um lembrete com as melhorias do perfil? Será enviado um aviso no portal e um e-mail.`)) return;
    setState(null);
    startTransition(async () => {
      const res = await sendSeoReminderAction(businessId);
      setState(res.success ? { type: 'ok', text: 'Lembrete enviado.' } : { type: 'error', text: res.error || 'Erro ao enviar.' });
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={send}
        disabled={pending || state?.type === 'ok'}
        className="text-sm font-bold text-stone-700 hover:underline disabled:opacity-50"
      >
        {pending ? 'Enviando...' : state?.type === 'ok' ? 'Lembrete enviado' : 'Avisar anunciante'}
      </button>
      {state?.type === 'error' ? <span className="max-w-[220px] text-right text-[11px] text-rose-700">{state.text}</span> : null}
    </span>
  );
}
