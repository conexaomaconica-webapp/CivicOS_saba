'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Badge, EmptyState } from '@saas/ui';
import { ModerationQueueItemViewModel } from '../../_types/view-models';

export interface ModerationQueueProps {
  item?: ModerationQueueItemViewModel;
  isLoading?: boolean;
  isError?: boolean;
  hasPermission?: boolean;
  onApprove?: (id: string, reason?: string) => void;
  onReject?: (id: string, reason?: string) => void;
  onRequestCorrection?: (id: string, guidance: string) => void;
  onOpenEvidence?: (url: string) => void;
}

export function ModerationQueue({
  item,
  isLoading = false,
  isError = false,
  hasPermission = true,
  onApprove,
  onReject,
  onRequestCorrection,
  onOpenEvidence
}: ModerationQueueProps) {
  const [reason, setReason] = useState('');
  const [correctionGuidance, setCorrectionGuidance] = useState('');
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);

  if (!hasPermission) {
    return (
      <EmptyState
        icon="🚫"
        title="Acesso Restrito"
        description="Sua conta não possui a permissão administrativa necessária para acessar a fila de moderação."
      />
    );
  }

  if (isLoading) {
    return (
      <Card variant="bordered" className="max-w-lg w-full p-6 text-center text-xs text-slate-400">
        Carregando item da fila de moderação...
      </Card>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon="🚨"
        title="Falha no Carregamento"
        description="Não foi possível carregar os dados da solicitação de moderação no momento."
      />
    );
  }

  if (!item) {
    return (
      <EmptyState
        icon="✅"
        title="Fila de Moderação Vazia"
        description="Todas as solicitações enviadas foram analisadas. Nenhum pendência no momento."
      />
    );
  }

  const handleRequestCorrectionSubmit = () => {
    if (!correctionGuidance.trim()) return;
    onRequestCorrection?.(item.id, correctionGuidance);
    setShowCorrectionInput(false);
  };

  return (
    <Card variant="bordered" className="max-w-lg w-full space-y-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Solicitação de Moderação #{item.id}</CardTitle>
          <Badge variant="warning" size="sm">Pendente Moderação</Badge>
        </div>
        <CardDescription>Submetido por: {item.submittedBy}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mandatory Demo Simulation Watermark Banner */}
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 font-mono text-center font-bold">
          ℹ️ AÇÃO DE DEMONSTRAÇÃO — NENHUM DADO SERÁ ALTERADO
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div><strong className="text-white">Empresa:</strong> {item.businessName}</div>
          <div><strong className="text-white">Tipo de Solicitação:</strong> {item.requestType}</div>
          <div><strong className="text-white">Data Submissão:</strong> {item.submittedAt}</div>
          {item.notes && <div><strong className="text-white font-mono">Observação:</strong> {item.notes}</div>}
        </div>

        {item.evidenceUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenEvidence?.(item.evidenceUrl!)}
            className="w-full text-xs"
          >
            📎 Abrir EvidênciaAnexa ({item.evidenceUrl})
          </Button>
        )}

        {showCorrectionInput ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <Input
              label="Orientação Objetiva de Correção (Obrigatória)*"
              placeholder="Descreva claramente o que o anunciante deve ajustar..."
              value={correctionGuidance}
              onChange={(e) => setCorrectionGuidance(e.target.value)}
              errorMessage={!correctionGuidance.trim() ? 'A orientação de correção é obrigatória.' : undefined}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowCorrectionInput(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!correctionGuidance.trim()}
                onClick={handleRequestCorrectionSubmit}
              >
                Enviar Solicitação de Correção
              </Button>
            </div>
          </div>
        ) : (
          <Input
            label="Justificativa da Decisão (Opcional)"
            placeholder="Digite a justificativa de aprovação ou rejeição..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </CardContent>

      {!showCorrectionInput && (
        <CardFooter className="flex flex-wrap gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setShowCorrectionInput(true)}>
            Solicitar Correção
          </Button>
          <Button size="sm" variant="danger" onClick={() => onReject?.(item.id, reason)}>
            Rejeitar
          </Button>
          <Button size="sm" variant="primary" onClick={() => onApprove?.(item.id, reason)}>
            Aprovar Registro
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
