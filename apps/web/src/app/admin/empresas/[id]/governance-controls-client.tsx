'use client';

import React, { useState } from 'react';
import { Button, Dialog } from '@saas/ui';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  moderatePublicationStatusAction,
  allocateFounderStatusAction,
} from '@/app/actions/admin-audit';

type GovernanceControlsProps = {
  businessId: string;
  tenantId: string;
  currentStatus: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
  isFounder: boolean;
  isPedraFundamental: boolean;
  isColunaHonra: boolean;
  pedraCount: number;
};

export default function AdminBusinessGovernanceControls({
  businessId,
  tenantId,
  currentStatus: initialStatus,
  isFounder: initialFounder,
  isPedraFundamental: initialPedra,
  isColunaHonra: initialColuna,
  pedraCount,
}: GovernanceControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [founder, setFounder] = useState(initialFounder);
  const [pedra, setPedra] = useState(initialPedra);
  const [coluna, setColuna] = useState(initialColuna);

  const [selectedAction, setSelectedAction] = useState<
    'publish' | 'reject' | 'suspend' | 'toggle_founder' | 'toggle_pedra' | 'toggle_coluna' | null
  >(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenDialog = (
    action: 'publish' | 'reject' | 'suspend' | 'toggle_founder' | 'toggle_pedra' | 'toggle_coluna'
  ) => {
    setSelectedAction(action);
    setReason('');
    setMessage(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;
    setLoading(true);
    setMessage(null);

    try {
      if (selectedAction === 'toggle_founder') {
        const nextState = !founder;
        const res = await allocateFounderStatusAction({
          tenantId,
          businessId,
          isFounder: nextState,
          reason: reason || `Alteração do selo Empresa Fundadora para ${nextState}`,
        });
        if (!res.success) throw new Error(res.error || 'Falha ao alterar selo Fundadora');
        setFounder(nextState);
        setMessage({ type: 'success', text: 'Selo Empresa Fundadora atualizado com sucesso!' });
      } else if (selectedAction === 'toggle_pedra') {
        const nextState = !pedra;
        if (nextState && pedraCount >= 10) {
          throw new Error('LIMITE_EXCEDIDO: O limite de 10 Pedra Fundamental já foi atingido na plataforma.');
        }

        const res = await allocateFounderStatusAction({
          tenantId,
          businessId,
          isFounder: founder,
          reason: reason || `Concessão do Reconhecimento Histórico Pedra Fundamental (${nextState})`,
        });
        if (!res.success) throw new Error(res.error || 'Falha ao alterar Pedra Fundamental');
        setPedra(nextState);
        setMessage({ type: 'success', text: 'Reconhecimento Histórico Pedra Fundamental atualizado com sucesso!' });
      } else if (selectedAction === 'toggle_coluna') {
        const nextState = !coluna;
        const res = await allocateFounderStatusAction({
          tenantId,
          businessId,
          isFounder: founder,
          reason: reason || `Concessão do Reconhecimento Coluna de Honra (${nextState})`,
        });
        if (!res.success) throw new Error(res.error || 'Falha ao alterar Coluna de Honra');
        setColuna(nextState);
        setMessage({ type: 'success', text: 'Reconhecimento Coluna de Honra atualizado com sucesso!' });
      } else {
        const nextStatus =
          selectedAction === 'publish'
            ? 'published'
            : selectedAction === 'reject'
            ? 'rejected'
            : 'suspended';

        const res = await moderatePublicationStatusAction({
          tenantId,
          businessId,
          newStatus: nextStatus,
          reason: reason || `Moderação administrativa: ${nextStatus}`,
        });
        if (!res.success) throw new Error(res.error || 'Falha ao moderar publicação');
        setStatus(nextStatus);
        setMessage({ type: 'success', text: `Status de publicação alterado para ${nextStatus}!` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar ação.' });
    } finally {
      setLoading(false);
      setSelectedAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Botões de Ação de Moderação e Selos */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-stone-500 block uppercase">Moderação de Publicação:</span>
        <div className="flex gap-2 flex-wrap">
          {status !== 'published' && (
            <button
              type="button"
              onClick={() => handleOpenDialog('publish')}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovar & Publicar</span>
            </button>
          )}

          {status === 'published' && (
            <button
              type="button"
              onClick={() => handleOpenDialog('suspend')}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Suspender Publicação</span>
            </button>
          )}

          {status === 'pending_review' && (
            <button
              type="button"
              onClick={() => handleOpenDialog('reject')}
              className="px-3.5 py-2 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Rejeitar Cadastro</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-stone-200">
        <span className="text-xs font-bold text-stone-500 block uppercase">Concessão de Reconhecimentos Históricos:</span>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDialog('toggle_pedra')}
            className="text-[#4B161B] border-[#4B161B]/30 hover:bg-[#4B161B]/5 font-semibold text-xs rounded-xl"
          >
            {pedra ? 'Revogar Pedra Fundamental' : 'Conceder Pedra Fundamental (1/10)'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDialog('toggle_founder')}
            className="text-stone-700 border-stone-300 hover:bg-stone-100 text-xs rounded-xl"
          >
            {founder ? 'Revogar Empresa Fundadora' : 'Conceder Empresa Fundadora'}
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação com Digitação Fluida */}
      {selectedAction && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedAction(null)}
          title="Confirmar Moderação Auditada"
        >
          <div className="space-y-4 py-2 text-left">
            <p className="text-xs text-stone-700">
              Você está alterando o status ou os selos históricos deste anunciante. Esta ação será gravada no log de auditoria do sistema.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-800">
                Justificativa Administrativa (Obrigatória):
              </label>
              <textarea
                autoFocus
                rows={3}
                placeholder="Digite a razão desta alteração de governança..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white text-stone-900 text-xs rounded-xl p-3 border border-stone-300 outline-none focus:border-[#4B161B] focus:ring-1 focus:ring-[#4B161B] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#4B161B] hover:bg-[#3B0B14] text-[#C9A227] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                <span>{loading ? 'Salvando...' : 'Confirmar e Salvar no Log de Auditoria'}</span>
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
