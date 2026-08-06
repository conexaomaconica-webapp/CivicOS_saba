'use client';

import React, { useState } from 'react';
import { Badge, Card, Toast } from '@saas/ui';
import { ModerationQueue } from '../../_components/domain/ModerationQueue';
import { MOCK_MODERATION_ITEMS } from '../../_mocks/moderation';
import { toModerationQueueItemViewModel } from '../../_types/view-models';

export default function AdminPilotPage() {
  const [hasPermission, setHasPermission] = useState(true);
  const [itemState, setItemState] = useState<'normal' | 'empty' | 'loading' | 'error'>('normal');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const mockItemViewModel = toModerationQueueItemViewModel(MOCK_MODERATION_ITEMS[0]!);

  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
            <span>🛡️ Piloto 3</span>
            <span>•</span>
            <span>Torre de Controle Administrativa & Moderação</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Fila de Moderação & Auditoria de Anúncios
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Análise de novos cadastros, evidências anexas, pareceres de correção e auditoria de ações.
          </p>
        </div>

        {/* State Controls for Testing */}
        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2">
          <span className="text-slate-400">Testar Estado:</span>
          <button
            onClick={() => { setItemState('normal'); setHasPermission(true); }}
            className={`px-2 py-1 rounded transition-colors ${itemState === 'normal' && hasPermission ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
          >
            Normal
          </button>
          <button
            onClick={() => { setItemState('empty'); setHasPermission(true); }}
            className={`px-2 py-1 rounded transition-colors ${itemState === 'empty' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
          >
            Fila Vazia
          </button>
          <button
            onClick={() => { setItemState('loading'); setHasPermission(true); }}
            className={`px-2 py-1 rounded transition-colors ${itemState === 'loading' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
          >
            Loading
          </button>
          <button
            onClick={() => { setItemState('error'); setHasPermission(true); }}
            className={`px-2 py-1 rounded transition-colors ${itemState === 'error' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
          >
            Erro
          </button>
          <button
            onClick={() => setHasPermission(false)}
            className={`px-2 py-1 rounded transition-colors ${!hasPermission ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
          >
            Sem Permissão
          </button>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <Toast
          toast={{
            id: 'act1',
            type: 'info',
            title: 'Ação Registrada no Audit Trail Simulado',
            message: actionFeedback
          }}
          onDismiss={() => setActionFeedback(null)}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Moderation Component */}
        <div className="lg:col-span-7 flex justify-center">
          <ModerationQueue
            item={itemState === 'normal' ? mockItemViewModel : undefined}
            isLoading={itemState === 'loading'}
            isError={itemState === 'error'}
            hasPermission={hasPermission}
            onApprove={(id, reason) => handleAction(`Aprovado #${id}. Motivo: ${reason || 'Sem ressalvas'}`)}
            onReject={(id, reason) => handleAction(`Rejeitado #${id}. Motivo: ${reason || 'Não informado'}`)}
            onRequestCorrection={(id, guidance) => handleAction(`Correção solicitada #${id}: "${guidance}"`)}
            onOpenEvidence={(url) => handleAction(`Abrindo evidência em janela simulada: ${url}`)}
          />
        </div>

        {/* Audit Log / History Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="bordered" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase">Histórico de Moderações Recentes</h3>
              <Badge variant="neutral">Audit Trail</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Oficina Irmãos Unidos</span>
                  <Badge variant="success" size="sm">Aprovado</Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Modera por: ADM-001 • Há 2 horas</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Padaria Pão da Cidade</span>
                  <Badge variant="warning" size="sm">Correção Solicitada</Badge>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Parecer: "Anexar comprovante CNPJ ativo"</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
