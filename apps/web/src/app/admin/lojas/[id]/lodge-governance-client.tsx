'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toggleLodgePublicationStatusAction } from '@/lib/admin/admin-lodges-service';

type LodgeGovernanceProps = {
  lodgeId: string;
  initialStatus: boolean;
};

export default function LodgeGovernanceControls({ lodgeId, initialStatus }: LodgeGovernanceProps) {
  const [isActive, setIsActive] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleStatus = async (targetStatus: boolean) => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await toggleLodgePublicationStatusAction(
        lodgeId,
        targetStatus,
        `Alteração de status da Loja Maçônica para ${targetStatus ? 'Publicada' : 'Inativa'}`
      );

      if (!res.success) throw new Error(res.error || 'Falha ao alterar status');

      setIsActive(targetStatus);
      setMessage({
        type: 'success',
        text: `Status da Loja alterado para ${targetStatus ? 'Publicada' : 'Inativa'} com sucesso!`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar ação.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-3 border-b border-stone-200">
      {message && (
        <div
          className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isActive ? (
          <button
            type="button"
            onClick={() => void handleToggleStatus(true)}
            disabled={loading}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Publicar Loja no Guia'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleToggleStatus(false)}
            disabled={loading}
            className="px-3.5 py-2 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Inativar Loja'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
