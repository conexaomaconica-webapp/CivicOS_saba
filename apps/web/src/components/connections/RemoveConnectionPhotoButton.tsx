'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImageOff } from 'lucide-react';
import { removeConnectionPhotoAction } from '@/app/actions/connections';

/** Remove só a foto da conexão (a conexão confirmada continua no mural, sem imagem). */
export function RemoveConnectionPhotoButton({ connectionId, onRemoved }: { connectionId: string; onRemoved?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (!window.confirm('Remover a foto desta conexão? A conexão continua registrada, apenas sem a imagem.')) return;
    setError('');
    startTransition(async () => {
      const res = await removeConnectionPhotoAction(connectionId);
      if (!res.success) {
        setError(res.error || 'Não foi possível remover a foto.');
        return;
      }
      onRemoved?.();
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline disabled:opacity-60"
      >
        <ImageOff className="h-3.5 w-3.5" />
        {pending ? 'Removendo…' : 'Remover foto'}
      </button>
      {error && (
        <span className="text-[10px] text-rose-700" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
